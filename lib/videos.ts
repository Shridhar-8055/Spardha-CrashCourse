/**
 * SERVER-ONLY video catalog.
 *
 * Imported by API routes only — never by a client component — so the YouTube
 * IDs never reach the browser as data. The client gets opaque ids (`v1`…) and
 * titles via /api/videos; playback happens through /api/videos/[id]/frame,
 * which renders the player on our own domain. This keeps the YouTube URL out of
 * every page the student can see or view-source.
 *
 * Imported from "Sri Spardha Videos.xlsx". To update the list, replace these
 * entries (or re-import the sheet).
 */

export interface VideoMeta {
  id: string; // opaque, public-facing id
  title: string; // display title shown to students
  youtubeId: string; // kept server-side
  uploadedAt: string; // ISO upload time (safe to expose; used for sorting)
}

const VIDEOS: VideoMeta[] = [
  { id: "v1", title: "Video 1", youtubeId: "2CtNOHQhz6E", uploadedAt: "2026-06-18T23:11:46" },
  { id: "v2", title: "Video 2", youtubeId: "Qzvvhe-SwNM", uploadedAt: "2026-06-18T23:16:49" },
  { id: "v3", title: "Video 3", youtubeId: "e1t5kRpxFfY", uploadedAt: "2026-06-18T23:17:34" },
  { id: "v4", title: "Video 4", youtubeId: "pPtxOuQIEPo", uploadedAt: "2026-06-18T23:17:45" },
  { id: "v5", title: "Video 5", youtubeId: "kihRKWgL3YM", uploadedAt: "2026-06-18T23:23:48" },
  { id: "v6", title: "Day 3 - Constitution", youtubeId: "q0r639P878I", uploadedAt: "2026-06-18T23:26:11" },
];

/** Public list — no YouTube IDs. */
export function listVideos(): { id: string; title: string; uploadedAt: string }[] {
  return VIDEOS.map(({ id, title, uploadedAt }) => ({ id, title, uploadedAt }));
}

export function getVideo(id: string): VideoMeta | undefined {
  return VIDEOS.find((v) => v.id === id);
}

export function videoCount(): number {
  return VIDEOS.length;
}
