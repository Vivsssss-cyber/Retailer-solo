import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/engine";
import { getAdminPin } from "@/server/adminSecret";
import { upsertConfiguration } from "@/server/service";
import { resetStoreForTests } from "@/server/store";
import { POST } from "../route";

beforeEach(() => {
  resetStoreForTests();
});

function post(body: unknown, headers?: Record<string, string>) {
  return POST(
    new Request("http://localhost/api/retailer-challenge/heats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

async function enableSoloPractice() {
  await upsertConfiguration(
    { ...DEFAULT_CONFIG, solo_practice_enabled: true },
    { makeDefault: true },
  );
}

describe("POST /heats authorization", () => {
  it("rejects solo create when solo practice is disabled (default)", async () => {
    const res = await post({ solo: true, player_name: "Ava" });
    expect(res.status).toBe(403);
  });

  it("allows solo create without pin when solo practice is enabled", async () => {
    await enableSoloPractice();
    const res = await post({ solo: true, player_name: "Ava" });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { access_code: string };
    expect(json.access_code).toMatch(/^SOLO-/);
  });

  it("rejects multiplayer create without pin", async () => {
    const res = await post({ solo: false });
    expect(res.status).toBe(401);
  });

  it("rejects omitted solo (multiplayer) without pin", async () => {
    const res = await post({});
    expect(res.status).toBe(401);
  });

  it("rejects multiplayer with wrong pin", async () => {
    const res = await post(
      { solo: false },
      { "X-Admin-Pin": "wrong" },
    );
    expect(res.status).toBe(401);
  });

  it("allows multiplayer create with admin pin", async () => {
    const res = await post(
      { solo: false },
      { "X-Admin-Pin": getAdminPin() },
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      heat_id: string;
      access_code: string;
    };
    expect(json.heat_id).toMatch(/^heat_/);
    expect(json.access_code).not.toMatch(/^SOLO-/);
  });
});
