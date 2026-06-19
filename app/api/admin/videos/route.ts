import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-server";
import { listVideos } from "@/lib/videos";

/** Admin: list videos with their current (effective) titles. */
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ videos: await listVideos() });
  } catch (err) {
    console.error("admin videos list error", err);
    return NextResponse.json({ error: "Could not load videos." }, { status: 500 });
  }
}
