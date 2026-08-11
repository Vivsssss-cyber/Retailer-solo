import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAdminPin } from "./adminSecret";

/** httpOnly cookie name for admin session after successful login. */
export const ADMIN_SESSION_COOKIE = "rc_admin_session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h classroom day

/**
 * Best-effort revocation list for explicit logout (single-node).
 * Signed cookies remain valid across process restarts; revoked tokens
 * are only remembered until process restart (acceptable for classroom).
 */
const revoked = new Set<string>();

/** HMAC secret: prefer ADMIN_SESSION_SECRET, else derive from ADMIN_PIN. */
function sessionSecret(): string {
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const pin = getAdminPin();
  if (pin) return `rc-admin-session-v1:${pin}`;
  // Unconfigured production — tokens will never validate via isValidAdminSession.
  return "rc-admin-session-unconfigured";
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payload: string): string {
  return b64url(
    createHmac("sha256", sessionSecret()).update(payload).digest(),
  );
}

/**
 * Mint a signed session token that survives process restarts.
 * Format: expMs.nonce.hmac
 */
export function createAdminSession(): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function revokeAdminSession(token: string | null | undefined): void {
  if (!token) return;
  revoked.add(token);
  // Bound memory on long-running nodes
  if (revoked.size > 5000) {
    const first = revoked.values().next().value;
    if (first) revoked.delete(first);
  }
}

export function isValidAdminSession(token: string | null | undefined): boolean {
  if (!token) return false;
  if (revoked.has(token)) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, mac] = parts;
  if (!expStr || !nonce || !mac) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;

  // Nonce is hex; reject garbage lengths
  if (!/^[a-f0-9]{32}$/i.test(nonce)) return false;

  const payload = `${expStr}.${nonce}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(mac, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
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

/** Test helper — wipe revocation set between tests. */
export function __resetAdminSessionsForTests(): void {
  revoked.clear();
}
