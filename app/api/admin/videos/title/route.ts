import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-server";
import { getVideo, invalidateVideosCache } from "@/lib/videos";
import { setVideoTitle, SheetsConfigError } from "@/lib/sheets";

/** Admin: rename a video. Body: { id (opaque), title }. */
export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { id?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const title = (body.title ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!title)
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });

  try {
    const video = await getVideo(id);
    if (!video)
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    // Stored keyed by the YouTube id (stays server-side).
    await setVideoTitle(video.youtubeId, title);
    invalidateVideosCache();
    return NextResponse.json({ ok: true, title });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("set video title error", err);
    return NextResponse.json(
      {
        error:
          "Could not save the title. If this persists, the Apps Script may need to be updated & redeployed (see SETUP).",
      },
      { status: 500 }
    );
  }
}
