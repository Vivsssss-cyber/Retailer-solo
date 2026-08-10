import { NextResponse } from "next/server";
import {
  adminSessionCookieHeader,
  attemptAdminLogin,
} from "@/server/adminAuth";
import { ApiError } from "@/server/errors";
import { jsonError, parseJson } from "@/server/http";

export const dynamic = "force-dynamic";

interface LoginBody {
  pin?: string;
}

export async function POST(request: Request) {
  try {
    const body = await parseJson<LoginBody>(request);
    const pin = typeof body?.pin === "string" ? body.pin : "";
    if (!pin.trim()) {
      throw new ApiError("BAD_REQUEST", "PIN is required");
    }

    const result = attemptAdminLogin(request, pin);
    if (!result.ok) {
      if (result.reason === "rate_limited") {
        throw new ApiError(
          "RATE_LIMITED",
          `Too many login attempts. Retry in ${result.retryAfterSec ?? 60}s`,
          429,
        );
      }
      if (result.reason === "not_configured") {
        throw new ApiError(
          "UNAUTHORIZED",
          "Admin PIN is not configured on the server (set ADMIN_PIN)",
          401,
        );
      }
      throw new ApiError("UNAUTHORIZED", "Incorrect PIN", 401);
    }

    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": adminSessionCookieHeader(result.token),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
