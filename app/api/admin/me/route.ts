import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth-server";

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}
