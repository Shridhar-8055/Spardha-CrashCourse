import { NextResponse } from "next/server";
import { getCurrentStudent, publicStudent } from "@/lib/auth-server";
import { SheetsConfigError } from "@/lib/sheets";

export async function GET() {
  try {
    const student = await getCurrentStudent();
    if (!student) return NextResponse.json({ user: null });
    return NextResponse.json({ user: publicStudent(student) });
  } catch (err) {
    if (err instanceof SheetsConfigError)
      return NextResponse.json({ user: null, configError: err.message });
    console.error("me error", err);
    return NextResponse.json({ user: null });
  }
}
