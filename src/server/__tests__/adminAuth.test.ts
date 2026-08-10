import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieHeader,
  attemptAdminLogin,
  createAdminSessionToken,
  isAdminAuthenticated,
  parseCookieHeader,
  requireAdmin,
  safeEqual,
  verifyAdminSessionToken,
} from "../adminAuth";
import { ApiError } from "../errors";
import { resetRateLimitsForTests } from "../rateLimit";

function req(
  init: {
    cookie?: string;
    pinHeader?: string;
    ip?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.pinHeader) headers.set("x-admin-pin", init.pinHeader);
  if (init.ip) headers.set("x-forwarded-for", init.ip);
  return new Request("http://localhost/api/test", { headers });
}

describe("adminAuth", () => {
  const prevPin = process.env.ADMIN_PIN;
  const prevSecret = process.env.ADMIN_SESSION_SECRET;
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    resetRateLimitsForTests();
    process.env.ADMIN_PIN = "test-secret-pin";
    process.env.ADMIN_SESSION_SECRET = "unit-test-session-secret";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    resetRateLimitsForTests();
    if (prevPin === undefined) delete process.env.ADMIN_PIN;
    else process.env.ADMIN_PIN = prevPin;
    if (prevSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prevSecret;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("safeEqual matches equal strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("a", "ab")).toBe(false);
  });

  it("signs and verifies session tokens", () => {
    const token = createAdminSessionToken();
    expect(verifyAdminSessionToken(token)).toBe(true);
    expect(verifyAdminSessionToken(token + "x")).toBe(false);
    expect(verifyAdminSessionToken("not.a.token")).toBe(false);
  });

  it("rejects expired tokens", () => {
    const token = createAdminSessionToken(Date.now() - 10_000, 1_000);
    expect(verifyAdminSessionToken(token)).toBe(false);
  });

  it("accepts valid session cookie", () => {
    const token = createAdminSessionToken();
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
    expect(isAdminAuthenticated(req({ cookie }))).toBe(true);
    expect(() => requireAdmin(req({ cookie }))).not.toThrow();
  });

  it("accepts matching X-Admin-Pin header", () => {
    expect(
      isAdminAuthenticated(req({ pinHeader: "test-secret-pin" })),
    ).toBe(true);
  });

  it("rejects wrong pin header and missing auth", () => {
    expect(isAdminAuthenticated(req({ pinHeader: "wrong" }))).toBe(false);
    expect(isAdminAuthenticated(req())).toBe(false);
    expect(() => requireAdmin(req())).toThrow(ApiError);
  });

  it("login mints a valid token for the correct pin", () => {
    const result = attemptAdminLogin(req({ ip: "1.1.1.1" }), "test-secret-pin");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(verifyAdminSessionToken(result.token)).toBe(true);
      const header = adminSessionCookieHeader(result.token);
      expect(header).toContain(ADMIN_SESSION_COOKIE);
      expect(header).toContain("HttpOnly");
    }
  });

  it("login rejects wrong pin", () => {
    const result = attemptAdminLogin(req({ ip: "2.2.2.2" }), "nope");
    expect(result).toEqual({ ok: false, reason: "bad_pin" });
  });

  it("rate-limits repeated login failures", () => {
    const ip = "9.9.9.9";
    for (let i = 0; i < 5; i++) {
      attemptAdminLogin(req({ ip }), "wrong");
    }
    const limited = attemptAdminLogin(req({ ip }), "wrong");
    expect(limited.ok).toBe(false);
    if (!limited.ok) {
      expect(limited.reason).toBe("rate_limited");
      expect(limited.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("parses cookie header values", () => {
    expect(
      parseCookieHeader("a=1; rc_admin_session=tok; b=2", ADMIN_SESSION_COOKIE),
    ).toBe("tok");
    expect(parseCookieHeader(null, ADMIN_SESSION_COOKIE)).toBeNull();
  });
});
