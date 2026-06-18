import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAdmin } from "@/lib/auth-server";
import {
  appendStudent,
  getStudents,
  getStudentByUserId,
  SheetsConfigError,
  type Student,
} from "@/lib/sheets";
import { hasActiveSession } from "@/lib/session";

function adminView(s: Student) {
  return {
    userId: s.userId,
    password: s.password,
    name: s.name,
    status: s.status,
    lastLoginAt: s.lastLoginAt,
    lastDevice: s.lastDevice,
    loginCount: s.loginCount,
    completedLessons: s.progress.length,
    online: hasActiveSession(s.sessionToken, s.sessionExpiresAt),
    createdAt: s.createdAt,
  };
}

function randomChars(n: number) {
  // Unambiguous alphabet (no 0/O/1/l).
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// GET — list all students (admin only)
export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const students = await getStudents();
    return NextResponse.json({ students: students.map(adminView) });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("list students error", err);
    return NextResponse.json({ error: "Could not load students." }, { status: 500 });
  }
}

// POST — create a new student credential (admin only)
export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { userId?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const all = await getStudents();
    if (all.length >= 50)
      return NextResponse.json(
        { error: "Student limit (50) reached. Remove a student first." },
        { status: 400 }
      );

    let userId = (body.userId ?? "").trim();
    if (userId) {
      if (await getStudentByUserId(userId))
        return NextResponse.json(
          { error: `User ID "${userId}" already exists.` },
          { status: 409 }
        );
    } else {
      // Generate a unique, readable id like "s-7k3qp".
      do {
        userId = "s-" + randomChars(5);
      } while (all.some((s) => s.userId.toLowerCase() === userId.toLowerCase()));
    }

    const password = (body.password ?? "").trim() || randomChars(8);

    const student: Student = {
      userId,
      password,
      name: (body.name ?? "").trim(),
      status: "active",
      sessionToken: "",
      sessionExpiresAt: "",
      lastLoginAt: "",
      lastDevice: "",
      loginCount: 0,
      progress: [],
      createdAt: new Date().toISOString(),
    };
    await appendStudent(student);
    return NextResponse.json({ ok: true, student: { userId, password } });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("create student error", err);
    return NextResponse.json({ error: "Could not create student." }, { status: 500 });
  }
}
