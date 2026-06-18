import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentStudent } from "@/lib/auth-server";
import { updateStudent } from "@/lib/sheets";
import { STUDENT_COOKIE } from "@/lib/session";

export async function POST() {
  try {
    const student = await getCurrentStudent();
    if (student) {
      // Clear the active session so this (or another) device can log in again.
      await updateStudent({
        ...student,
        sessionToken: "",
        sessionExpiresAt: "",
      });
    }
  } catch (err) {
    console.error("logout error", err);
    // Still clear the cookie even if the sheet write fails.
  }
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
  return NextResponse.json({ ok: true });
}
