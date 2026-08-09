import { getAdminPin, isAdminPinConfigured } from "./adminSecret";
import {
  isValidAdminSession,
  parseCookieHeader,
  ADMIN_SESSION_COOKIE,
  safeEqualString,
} from "./adminSession";
import { ApiError } from "./errors";

/**
 * Lightweight admin gate for local/dev write endpoints.
 * Accepts:
 *  - Header X-Admin-Pin (scripts / smoke tests — server compares to env)
 *  - httpOnly cookie rc_admin_session (browser after POST /admin/login)
 * Never embed ADMIN_PIN in client bundles.
 */
export function requireAdminPin(request: Request): void {
  if (!isAdminPinConfigured()) {
    throw new ApiError(
      "BAD_REQUEST",
      "Admin PIN is not configured on the server (set ADMIN_PIN).",
      503,
    );
  }

  const headerPin =
    request.headers.get("x-admin-pin") ??
    request.headers.get("X-Admin-Pin") ??
    "";
  if (headerPin.trim() && safeEqualString(headerPin.trim(), getAdminPin())) {
    return;
  }

  const cookieToken = parseCookieHeader(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  );
  if (isValidAdminSession(cookieToken)) {
    return;
  }

  throw new ApiError("BAD_REQUEST", "Invalid or missing admin credentials", 401);
}
