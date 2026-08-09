import { beforeEach, describe, expect, it } from "vitest";
import { requireAdminPin } from "../adminAuth";
import { getAdminPin } from "../adminSecret";
import {
  __resetAdminSessionsForTests,
  adminSessionCookieValue,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
} from "../adminSession";
import { requirePlayerToken } from "../playerAuth";
import {
  __resetRateLimitsForTests,
  assertRateLimit,
} from "../rateLimit";
import { ApiError } from "../errors";
import { createAttempt, createHeat } from "../service";
import { resetStoreForTests } from "../store";

beforeEach(() => {
  resetStoreForTests();
  __resetAdminSessionsForTests();
  __resetRateLimitsForTests();
});

function makeRequest(
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/test", { headers });
}

describe("Phase A — admin auth", () => {
  it("rejects missing credentials", () => {
    expect(() => requireAdminPin(makeRequest())).toThrow(ApiError);
    try {
      requireAdminPin(makeRequest());
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });

  it("accepts correct X-Admin-Pin header (server env)", () => {
    expect(() =>
      requireAdminPin(
        makeRequest({ "X-Admin-Pin": getAdminPin() }),
      ),
    ).not.toThrow();
  });

  it("rejects wrong PIN header", () => {
    expect(() =>
      requireAdminPin(makeRequest({ "X-Admin-Pin": "wrong-pin" })),
    ).toThrow(ApiError);
  });

  it("accepts valid admin session cookie", () => {
    const token = createAdminSession();
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`;
    expect(() =>
      requireAdminPin(makeRequest({ cookie })),
    ).not.toThrow();
  });

  it("rejects forged session cookie", () => {
    expect(() =>
      requireAdminPin(
        makeRequest({ cookie: `${ADMIN_SESSION_COOKIE}=deadbeef` }),
      ),
    ).toThrow(ApiError);
  });

  it("admin session cookie helper sets HttpOnly", () => {
    const v = adminSessionCookieValue("abc");
    expect(v).toContain("HttpOnly");
    expect(v).toContain(ADMIN_SESSION_COOKIE);
  });
});

describe("Phase B — player ownership tokens", () => {
  it("mints unique player_token on create", async () => {
    const heat = await createHeat({ solo: false });
    const a = await createAttempt(heat.heat_id, { player_name: "A" });
    const b = await createAttempt(heat.heat_id, { player_name: "B" });
    expect(a.player_token).not.toBe(b.player_token);
    expect(a.player_token.length).toBeGreaterThanOrEqual(32);
  });

  it("requirePlayerToken accepts matching token", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt, player_token } = await createAttempt(heat.heat_id, {
      player_name: "Ava",
    });
    expect(() =>
      requirePlayerToken(
        makeRequest({ "X-Player-Token": player_token }),
        attempt.attempt_id,
      ),
    ).not.toThrow();
  });

  it("requirePlayerToken rejects missing and wrong tokens", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt, player_token } = await createAttempt(heat.heat_id, {
      player_name: "Ava",
    });
    expect(() =>
      requirePlayerToken(makeRequest(), attempt.attempt_id),
    ).toThrow(ApiError);
    expect(() =>
      requirePlayerToken(
        makeRequest({ "X-Player-Token": "not-the-token" }),
        attempt.attempt_id,
      ),
    ).toThrow(ApiError);
    expect(() =>
      requirePlayerToken(
        makeRequest({ "X-Player-Token": player_token }),
        "att_does_not_exist",
      ),
    ).toThrow(ApiError);
  });

  it("accepts Bearer form", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt, player_token } = await createAttempt(heat.heat_id, {
      player_name: "Ava",
    });
    expect(() =>
      requirePlayerToken(
        makeRequest({ Authorization: `Bearer ${player_token}` }),
        attempt.attempt_id,
      ),
    ).not.toThrow();
  });
});

describe("Phase C — access code / QR join (no OTP)", () => {
  it("join via multiplayer access code only", async () => {
    const heat = await createHeat({ solo: false });
    expect(heat.access_code).toHaveLength(8);
    const { attempt } = await createAttempt(heat.access_code, {
      player_name: "QR Joiner",
      // No email OTP required — optional identity only
      is_official: true,
    });
    expect(attempt.heat_id).toBe(heat.heat_id);
    expect(attempt.player_name).toBe("QR Joiner");
  });

  it("heat not found for bad code", async () => {
    await expect(
      createAttempt("ZZZZZZZZ", { player_name: "Ghost" }),
    ).rejects.toMatchObject({ code: "HEAT_NOT_FOUND" });
  });
});

describe("Phase D — rate limits", () => {
  it("trips after limit", () => {
    const key = "test-bucket";
    for (let i = 0; i < 3; i++) {
      assertRateLimit({ key, limit: 3, windowMs: 60_000 });
    }
    expect(() =>
      assertRateLimit({ key, limit: 3, windowMs: 60_000 }),
    ).toThrow(ApiError);
    try {
      assertRateLimit({ key, limit: 3, windowMs: 60_000 });
    } catch (e) {
      expect((e as ApiError).code).toBe("RATE_LIMITED");
      expect((e as ApiError).status).toBe(429);
    }
  });
});
