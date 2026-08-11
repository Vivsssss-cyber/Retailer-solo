import { beforeEach, describe, expect, it } from "vitest";
import {
  isAdminAuthenticated,
  requireAdmin,
  requireAdminPin,
} from "../adminAuth";
import { getAdminPin } from "../adminSecret";
import {
  __resetAdminSessionsForTests,
  adminSessionCookieValue,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
} from "../adminSession";
import { ApiError } from "../errors";
import { __resetRateLimitsForTests } from "../rateLimit";

beforeEach(() => {
  __resetAdminSessionsForTests();
  __resetRateLimitsForTests();
});

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("adminAuth (modular session + pin)", () => {
  it("requireAdmin / requireAdminPin reject missing credentials", () => {
    expect(() => requireAdmin(req())).toThrow(ApiError);
    expect(() => requireAdminPin(req())).toThrow(ApiError);
    expect(isAdminAuthenticated(req())).toBe(false);
  });

  it("accepts correct X-Admin-Pin header", () => {
    const pin = getAdminPin();
    expect(() => requireAdmin(req({ "X-Admin-Pin": pin }))).not.toThrow();
    expect(isAdminAuthenticated(req({ "X-Admin-Pin": pin }))).toBe(true);
  });

  it("rejects wrong PIN header", () => {
    expect(() => requireAdmin(req({ "X-Admin-Pin": "wrong-pin" }))).toThrow(
      ApiError,
    );
    expect(isAdminAuthenticated(req({ "X-Admin-Pin": "wrong-pin" }))).toBe(
      false,
    );
  });

  it("accepts valid admin session cookie", () => {
    const token = createAdminSession();
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
    expect(() => requireAdmin(req({ cookie }))).not.toThrow();
    expect(isAdminAuthenticated(req({ cookie }))).toBe(true);
  });

  it("rejects forged session cookie", () => {
    const cookie = `${ADMIN_SESSION_COOKIE}=deadbeef`;
    expect(() => requireAdmin(req({ cookie }))).toThrow(ApiError);
  });

  it("session survives validation after create (signed cookie)", () => {
    const token = createAdminSession();
    expect(token.split(".").length).toBe(3);
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
    expect(isAdminAuthenticated(req({ cookie }))).toBe(true);
  });

  it("admin session cookie helper sets HttpOnly", () => {
    const v = adminSessionCookieValue("abc");
    expect(v).toContain("HttpOnly");
    expect(v).toContain(ADMIN_SESSION_COOKIE);
  });
});
