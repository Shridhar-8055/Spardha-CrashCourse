import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/auth-server";
import { listVideos } from "@/lib/videos";

/** Auth-gated list of videos — titles + opaque ids only, never YouTube URLs. */
export async function GET() {
  const student = await getCurrentStudent();
  if (!student)
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ videos: listVideos() });
}
