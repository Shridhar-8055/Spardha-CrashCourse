import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-server";
import {
  deleteStudent,
  getStudentByUserId,
  updateStudent,
  SheetsConfigError,
} from "@/lib/sheets";

type Action = "reset" | "delete" | "disable" | "enable";

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { userId?: string; action?: Action };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const userId = (body.userId ?? "").trim();
  const action = body.action;
  if (!userId || !action)
    return NextResponse.json(
      { error: "userId and action are required." },
      { status: 400 }
    );

  try {
    const student = await getStudentByUserId(userId);
    if (!student)
      return NextResponse.json({ error: "Student not found." }, { status: 404 });

    switch (action) {
      case "reset":
        // Clear the active session → frees the single-device lock.
        await updateStudent({ ...student, sessionToken: "", sessionExpiresAt: "" });
        break;
      case "disable":
        await updateStudent({
          ...student,
          status: "disabled",
          sessionToken: "",
          sessionExpiresAt: "",
        });
        break;
      case "enable":
        await updateStudent({ ...student, status: "active" });
        break;
      case "delete":
        await deleteStudent(student.userId);
        break;
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("admin action error", err);
    return NextResponse.json({ error: "Action failed." }, { status: 500 });
  }
}
