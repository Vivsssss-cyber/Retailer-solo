import { randomBytes, timingSafeEqual } from "crypto";

/** httpOnly cookie name for admin session after successful login. */
export const ADMIN_SESSION_COOKIE = "rc_admin_session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h classroom day

type Session = { expiresAt: number };

/** In-memory sessions (single-node file-store era). */
const sessions = new Map<string, Session>();

function prune(): void {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(token);
  }
}

export function createAdminSession(): string {
  prune();
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function revokeAdminSession(token: string | null | undefined): void {
  if (!token) return;
  sessions.delete(token);
}

export function isValidAdminSession(token: string | null | undefined): boolean {
  if (!token) return false;
  prune();
  const s = sessions.get(token);
  if (!s) return false;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

/** Constant-time string compare for PINs. */
export function safeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still run a compare to reduce timing signal on length-only path.
    const dummy = Buffer.alloc(ab.length);
    timingSafeEqual(ab, dummy);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function parseCookieHeader(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function adminSessionCookieValue(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearAdminSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** Test helper — wipe sessions between tests. */
export function __resetAdminSessionsForTests(): void {
  sessions.clear();
}
