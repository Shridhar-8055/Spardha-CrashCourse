import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  getStudentByUserId,
  updateStudent,
  SheetsConfigError,
} from "@/lib/sheets";
import {
  STUDENT_COOKIE,
  SESSION_TTL_MS,
  expiryFromNow,
  hasActiveSession,
  makeStudentCookie,
  randomToken,
} from "@/lib/session";
import { publicStudent } from "@/lib/auth-server";

export async function POST(req: Request) {
  let body: { name?: string; userId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const userId = (body.userId ?? "").trim();
  const password = body.password ?? "";

  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!userId || !password)
    return NextResponse.json(
      { error: "User ID and password are required." },
      { status: 400 }
    );

  try {
    const student = await getStudentByUserId(userId);
    if (!student || student.password !== password)
      return NextResponse.json(
        { error: "Incorrect User ID or password." },
        { status: 401 }
      );

    if (student.status === "disabled")
      return NextResponse.json(
        { error: "This account has been disabled. Contact your admin." },
        { status: 403 }
      );

    // Single-device rule: if a valid session already exists, block this login.
    if (hasActiveSession(student.sessionToken, student.sessionExpiresAt))
      return NextResponse.json(
        {
          error:
            "You're already logged in on another device. Log out there first, or ask your admin to reset your session.",
        },
        { status: 409 }
      );

    // Issue a fresh session and record the login in the sheet.
    const token = randomToken();
    const ua = (await headers()).get("user-agent") ?? "unknown device";
    const updated = {
      ...student,
      name, // capture the name the student typed
      sessionToken: token,
      sessionExpiresAt: expiryFromNow(),
      lastLoginAt: new Date().toISOString(),
      lastDevice: ua.slice(0, 250),
      loginCount: student.loginCount + 1,
    };
    await updateStudent(updated);

    const store = await cookies();
    store.set(STUDENT_COOKIE, makeStudentCookie(student.userId, token), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });

    return NextResponse.json({ ok: true, user: publicStudent(updated) });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("login error", err);
    return NextResponse.json(
      { error: "Something went wrong signing you in." },
      { status: 500 }
    );
  }
}
