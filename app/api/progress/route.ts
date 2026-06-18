import { NextResponse } from "next/server";
import { getCurrentStudent, publicStudent } from "@/lib/auth-server";
import { updateStudent } from "@/lib/sheets";

/** Toggle / set a lesson's completion for the logged-in student. */
export async function POST(req: Request) {
  const student = await getCurrentStudent();
  if (!student)
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { lessonId?: string; completed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const lessonId = (body.lessonId ?? "").trim();
  if (!lessonId)
    return NextResponse.json({ error: "lessonId is required." }, { status: 400 });

  const set = new Set(student.progress);
  // If `completed` is provided use it; otherwise toggle.
  const target =
    typeof body.completed === "boolean" ? body.completed : !set.has(lessonId);
  if (target) set.add(lessonId);
  else set.delete(lessonId);

  const updated = { ...student, progress: Array.from(set) };
  try {
    await updateStudent(updated);
  } catch (err) {
    console.error("progress write error", err);
    return NextResponse.json(
      { error: "Could not save progress." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, user: publicStudent(updated) });
}
