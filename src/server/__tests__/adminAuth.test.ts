import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthenticated,
  requireAdmin,
  requireAdminPin,
  safeEqual,
} from "../adminAuth";
import {
  __resetAdminSessionsForTests,
  createAdminSession,
  adminSessionCookieValue,
} from "../adminSession";
import { getAdminPin } from "../adminSecret";
import { ApiError } from "../errors";
import { __resetRateLimitsForTests } from "../rateLimit";

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
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    __resetRateLimitsForTests();
    __resetAdminSessionsForTests();
    process.env.ADMIN_PIN = "test-secret-pin";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    __resetRateLimitsForTests();
    __resetAdminSessionsForTests();
    if (prevPin === undefined) delete process.env.ADMIN_PIN;
    else process.env.ADMIN_PIN = prevPin;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it("safeEqual matches equal strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("a", "ab")).toBe(false);
  });

  it("accepts valid session cookie", () => {
    const token = createAdminSession();
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
    expect(isAdminAuthenticated(req({ cookie }))).toBe(true);
    expect(() => requireAdmin(req({ cookie }))).not.toThrow();
    expect(() => requireAdminPin(req({ cookie }))).not.toThrow();
  });

  it("accepts matching X-Admin-Pin header", () => {
    expect(
      isAdminAuthenticated(req({ pinHeader: "test-secret-pin" })),
    ).toBe(true);
    expect(() =>
      requireAdmin(req({ pinHeader: getAdminPin() })),
    ).not.toThrow();
  });

  it("rejects wrong pin header and missing auth", () => {
    expect(isAdminAuthenticated(req({ pinHeader: "wrong" }))).toBe(false);
    expect(isAdminAuthenticated(req())).toBe(false);
    expect(() => requireAdmin(req())).toThrow(ApiError);
  });

  it("rejects forged session cookie", () => {
    expect(
      isAdminAuthenticated(
        req({ cookie: `${ADMIN_SESSION_COOKIE}=deadbeef` }),
      ),
    ).toBe(false);
  });

  it("admin session cookie helper sets HttpOnly", () => {
    const v = adminSessionCookieValue("abc");
    expect(v).toContain("HttpOnly");
    expect(v).toContain(ADMIN_SESSION_COOKIE);
  });
});
