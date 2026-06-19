import crypto from "crypto";
import { getVideoTitleOverrides } from "./sheets";

/**
 * SERVER-ONLY video catalog, read live from a Google Sheet (CSV export).
 *
 * The sheet (env VIDEOS_SHEET_ID) has columns: title, youtube_id, youtube_url,
 * upload_time. Add a row → it shows up in the app within ~60s (cache TTL).
 *
 * The real YouTube id never reaches the browser: the client gets an OPAQUE
 * hashed id + title, and playback goes through /api/videos/[id]/frame, which
 * maps the hash back to the YouTube id on the server.
 */

export interface VideoMeta {
  id: string; // opaque, public-facing (hash of the youtube id)
  title: string;
  youtubeId: string; // kept server-side
  uploadedAt: string; // ISO, for sorting
}

function csvUrl(): string | null {
  const id = process.env.VIDEOS_SHEET_ID;
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields and commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function extractYoutubeId(idCol: string, urlCol: string): string {
  const id = (idCol || "").trim();
  if (id) return id;
  const url = (urlCol || "").trim();
  const m =
    url.match(/[?&]v=([\w-]+)/) ||
    url.match(/youtu\.be\/([\w-]+)/) ||
    url.match(/embed\/([\w-]+)/);
  return m ? m[1] : "";
}

/** Auto-generated upload titles are timestamps; clean those into "Video N". */
function cleanTitle(raw: string, index: number): string {
  let t = (raw || "").trim();
  t = t.replace(/\.mp4(\s*-\s*copy)?$/i, "").replace(/\s*-\s*copy$/i, "").trim();
  const timestampLike = /^\d{4}[-/]\d{2}[-/]\d{2}([\sT_-]|$)/.test(t);
  if (!t || timestampLike) return `Video ${index}`;
  return t;
}

/** "18-06-2026 23:11:46" (DD-MM-YYYY) → ISO "2026-06-18T23:11:46". */
function parseUpload(raw: string): string {
  const m = (raw || "").match(
    /(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || "00"}`;
  return (raw || "").trim();
}

function opaqueId(youtubeId: string): string {
  return "v" + crypto.createHash("sha256").update(youtubeId).digest("hex").slice(0, 12);
}

// ── Cache (per warm server instance) ───────────────────────────────────────
let cache: { at: number; videos: VideoMeta[] } | null = null;
const TTL_MS = 60_000;

async function fetchVideos(): Promise<VideoMeta[]> {
  const url = csvUrl();
  if (!url) {
    console.warn("VIDEOS_SHEET_ID is not set — no videos to show.");
    return [];
  }
  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`Videos sheet fetch failed: HTTP ${res.status}`);
  const rows = parseCsv(await res.text());
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const iTitle = header.indexOf("title");
  const iId = header.indexOf("youtube_id");
  const iUrl = header.indexOf("youtube_url");
  const iTime = header.indexOf("upload_time");

  // Admin-set custom names take precedence over the sheet's title column.
  const overrides = await getVideoTitleOverrides();

  const videos: VideoMeta[] = [];
  let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const ytId = extractYoutubeId(
      iId >= 0 ? row[iId] : "",
      iUrl >= 0 ? row[iUrl] : ""
    );
    if (!ytId) continue;
    n++;
    const custom = (overrides[ytId] || "").trim();
    videos.push({
      id: opaqueId(ytId),
      title: custom || cleanTitle(iTitle >= 0 ? row[iTitle] : "", n),
      youtubeId: ytId,
      uploadedAt: parseUpload(iTime >= 0 ? row[iTime] : ""),
    });
  }
  return videos;
}

/** Force the next read to refetch (used after an admin renames a video). */
export function invalidateVideosCache() {
  cache = null;
}

export async function getAllVideos(): Promise<VideoMeta[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.videos;
  try {
    const videos = await fetchVideos();
    cache = { at: now, videos };
    return videos;
  } catch (err) {
    console.error("getAllVideos error", err);
    // Serve stale cache if we have it; otherwise empty.
    return cache?.videos ?? [];
  }
}

/** Public list — no YouTube ids. */
export async function listVideos(): Promise<
  { id: string; title: string; uploadedAt: string }[]
> {
  const videos = await getAllVideos();
  return videos.map(({ id, title, uploadedAt }) => ({ id, title, uploadedAt }));
}

export async function getVideo(id: string): Promise<VideoMeta | undefined> {
  const videos = await getAllVideos();
  return videos.find((v) => v.id === id);
}
