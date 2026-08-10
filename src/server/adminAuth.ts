/**
 * Admin authentication for write/admin endpoints.
 *
 * - PIN from server env `ADMIN_PIN` (never `NEXT_PUBLIC_*`)
 * - After login: signed HttpOnly session cookie
 * - Optional `X-Admin-Pin` header for scripts/smoke (PIN still server-side only)
 * - Login rate-limited per IP
 *
 * Not full SSO — see AGENTS.md for production upgrade path.
 */

import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { ApiError } from "./errors";
import { checkRateLimit } from "./rateLimit";

export const ADMIN_SESSION_COOKIE = "rc_admin_session";
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const ADMIN_SESSION_TTL_SEC = Math.floor(ADMIN_SESSION_TTL_MS / 1000);

/** Login: 5 attempts per 15 minutes per IP. */
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Failed auth probes on protected routes: 30 / 15 min per IP. */
const PROBE_LIMIT = 30;
const PROBE_WINDOW_MS = 15 * 60 * 1000;

interface SessionPayload {
  v: 1;
  exp: number;
  iat: number;
}

/** Server-only admin PIN. Dev default `admin` when unset; production requires env. */
export function getAdminPin(): string {
  const fromEnv = process.env.ADMIN_PIN?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") return "";
  return "admin";
}

function getSessionSecret(): string {
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const pin = getAdminPin();
  // Derive a stable secret so cookies verify across restarts without extra env in dev.
  return createHash("sha256")
    .update(`rc-admin-session-v1:${pin || "unset"}`)
    .digest("hex");
}

/** Constant-time string compare (length-safe). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) {
    // Dummy compare so length mismatch doesn't short-circuit timing entirely.
    const dummy = randomBytes(32);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function createAdminSessionToken(
  now = Date.now(),
  ttlMs = ADMIN_SESSION_TTL_MS,
): string {
  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string,
  now = Date.now(),
): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, sig] = parts;
  if (!body || !sig) return false;
  const expected = createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  if (!safeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (payload.v !== 1) return false;
    if (typeof payload.exp !== "number" || payload.exp <= now) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCookieHeader(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return part.slice(idx + 1).trim();
  }
  return null;
}

export function adminSessionCookieHeader(
  token: string,
  maxAgeSec = ADMIN_SESSION_TTL_SEC,
): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearAdminSessionCookieHeader(): string {
  const parts = [
    `${ADMIN_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function pinFromHeader(request: Request): string {
  return (
    request.headers.get("x-admin-pin") ??
    request.headers.get("X-Admin-Pin") ??
    ""
  ).trim();
}

function hasValidSession(request: Request): boolean {
  const raw = parseCookieHeader(
    request.headers.get("cookie"),
    ADMIN_SESSION_COOKIE,
  );
  return Boolean(raw && verifyAdminSessionToken(raw));
}

function hasValidPinHeader(request: Request): boolean {
  const expected = getAdminPin();
  if (!expected) return false;
  const provided = pinFromHeader(request);
  if (!provided) return false;
  return safeEqual(provided, expected);
}

/** True when request carries a valid session cookie or matching admin PIN header. */
export function isAdminAuthenticated(request: Request): boolean {
  return hasValidSession(request) || hasValidPinHeader(request);
}

/**
 * Gate for admin write endpoints.
 * Prefers session cookie; accepts X-Admin-Pin for server-side scripts.
 */
export function requireAdmin(request: Request): void {
  if (isAdminAuthenticated(request)) return;

  const ip = clientIp(request);
  const limited = checkRateLimit(
    `admin-probe:${ip}`,
    PROBE_LIMIT,
    PROBE_WINDOW_MS,
  );
  if (!limited.ok) {
    throw new ApiError(
      "RATE_LIMITED",
      `Too many requests. Retry in ${limited.retryAfterSec}s`,
      429,
    );
  }
  throw new ApiError(
    "UNAUTHORIZED",
    "Admin authentication required",
    401,
  );
}

/** @deprecated Use requireAdmin — kept for any external imports during transition. */
export function requireAdminPin(request: Request): void {
  requireAdmin(request);
}

export type AdminLoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: "bad_pin" | "not_configured" | "rate_limited"; retryAfterSec?: number };

/**
 * Verify PIN and mint a session token (caller sets Set-Cookie).
 * Rate-limited per IP.
 */
export function attemptAdminLogin(
  request: Request,
  pin: string,
): AdminLoginResult {
  const ip = clientIp(request);
  const limited = checkRateLimit(
    `admin-login:${ip}`,
    LOGIN_LIMIT,
    LOGIN_WINDOW_MS,
  );
  if (!limited.ok) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterSec: limited.retryAfterSec,
    };
  }

  const expected = getAdminPin();
  if (!expected) {
    return { ok: false, reason: "not_configured" };
  }

  if (!safeEqual(pin.trim(), expected)) {
    return { ok: false, reason: "bad_pin" };
  }

  return { ok: true, token: createAdminSessionToken() };
}
