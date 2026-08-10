/**
 * Admin authentication for write/admin endpoints.
 *
 * - PIN from server env `ADMIN_PIN` via adminSecret (never `NEXT_PUBLIC_*`)
 * - After login: in-memory httpOnly session cookie (adminSession)
 * - Optional `X-Admin-Pin` header for scripts/smoke (PIN still server-side only)
 * - Login rate-limited at the route layer
 *
 * Never embed ADMIN_PIN in client bundles.
 */

import { getAdminPin, isAdminPinConfigured } from "./adminSecret";
import {
  isValidAdminSession,
  parseCookieHeader,
  ADMIN_SESSION_COOKIE,
  safeEqualString,
  createAdminSession,
  adminSessionCookieValue,
  clearAdminSessionCookie,
  revokeAdminSession,
} from "./adminSession";
import { ApiError } from "./errors";

export { ADMIN_SESSION_COOKIE };

/** Re-export cookie helpers used by login/logout routes. */
export {
  parseCookieHeader,
  adminSessionCookieValue as adminSessionCookieHeader,
  clearAdminSessionCookie as clearAdminSessionCookieHeader,
  createAdminSession,
  revokeAdminSession,
  safeEqualString as safeEqual,
};

/**
 * Lightweight admin gate for write endpoints.
 * Accepts:
 *  - Header X-Admin-Pin (scripts / smoke tests — server compares to env)
 *  - httpOnly cookie rc_admin_session (browser after POST /admin/login)
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

  throw new ApiError(
    "UNAUTHORIZED",
    "Invalid or missing admin credentials",
    401,
  );
}

/** Preferred name used by admin write routes. */
export function requireAdmin(request: Request): void {
  requireAdminPin(request);
}

/** Non-throwing check for GET /admin/session. */
export function isAdminAuthenticated(request: Request): boolean {
  if (!isAdminPinConfigured()) return false;

  const headerPin =
    request.headers.get("x-admin-pin") ??
    request.headers.get("X-Admin-Pin") ??
    "";
  if (headerPin.trim() && safeEqualString(headerPin.trim(), getAdminPin())) {
    return true;
  }

  const cookieToken = parseCookieHeader(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  );
  return isValidAdminSession(cookieToken);
}
