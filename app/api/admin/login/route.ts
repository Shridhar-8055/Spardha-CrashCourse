import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, SESSION_TTL_MS, makeAdminCookie } from "@/lib/session";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected)
    return NextResponse.json(
      { error: "Admin password is not configured (set ADMIN_PASSWORD)." },
      { status: 503 }
    );

  if ((body.password ?? "") !== expected)
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });

  const store = await cookies();
  store.set(ADMIN_COOKIE, makeAdminCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return NextResponse.json({ ok: true });
}
