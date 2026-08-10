import { getAdminPin, isAdminPinConfigured } from "@/server/adminSecret";
import {
  adminSessionCookieValue,
  createAdminSession,
  safeEqualString,
} from "@/server/adminSession";
import { ApiError } from "@/server/errors";
import { jsonError, jsonOk, parseJson } from "@/server/http";
import { assertRateLimit, clientIpFromRequest } from "@/server/rateLimit";

export const dynamic = "force-dynamic";

interface LoginBody {
  pin?: string;
}

/**
 * Exchange admin PIN for httpOnly session cookie.
 * PIN never needs to live in the client bundle after login.
 */
export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `admin-login:${clientIpFromRequest(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!isAdminPinConfigured()) {
      throw new ApiError(
        "BAD_REQUEST",
        "Admin PIN is not configured on the server (set ADMIN_PIN).",
        503,
      );
    }

    const body = await parseJson<LoginBody>(request);
    const pin = body?.pin?.trim() ?? "";
    if (!pin || !safeEqualString(pin, getAdminPin())) {
      throw new ApiError("BAD_REQUEST", "Incorrect admin PIN", 401);
    }

    const token = createAdminSession();
    const res = jsonOk({ ok: true as const });
    res.headers.set("Set-Cookie", adminSessionCookieValue(token));
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
