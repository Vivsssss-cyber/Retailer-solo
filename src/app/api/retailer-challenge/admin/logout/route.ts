import { NextResponse } from "next/server";
import { clearAdminSessionCookieHeader } from "@/server/adminAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearAdminSessionCookieHeader(),
    },
  });
}
