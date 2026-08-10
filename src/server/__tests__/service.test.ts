import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/engine";
import { ApiError } from "../errors";
import { resetStoreForTests } from "../store";
import {
  completeAttempt,
  createAttempt,
  createHeat,
  getAttempt,
  getConfiguration,
  getGlobalLeaderboard,
  getHeatLeaderboard,
  submitRound,
  upsertConfiguration,
} from "../service";

beforeEach(() => {
  resetStoreForTests();
});

describe("configuration", () => {
  it("returns seeded EU default", () => {
    const config = getConfiguration("eu-retailer-challenge-v1");
    expect(config.configuration_id).toBe(DEFAULT_CONFIG.configuration_id);
    expect(config.total_rounds).toBe(12);
    expect(config.customer_demand_by_round).toHaveLength(12);
  });

  it("resolves default alias", () => {
    const config = getConfiguration("default");
    expect(config.configuration_id).toBe(DEFAULT_CONFIG.configuration_id);
  });

  it("upsert becomes active seed for new heats", async () => {
    const patched = {
      ...DEFAULT_CONFIG,
      total_rounds: 8,
      customer_demand_by_round: [5, 5, 5, 5, 5, 5, 5, 5],
      supply_rate_by_round: [1, 1, 1, 1, 1, 1, 1, 1],
      configuration_version: 2,
    };
    await upsertConfiguration(patched);
    const active = getConfiguration("default");
    expect(active.total_rounds).toBe(8);
    expect(active.configuration_version).toBe(2);

    const heat = await createHeat({ solo: true });
    expect(heat.configuration.total_rounds).toBe(8);
    expect(heat.configuration.configuration_version).toBe(2);
  });
});

describe("heat + attempt lifecycle", () => {
  it("creates heat with access code and snapshot", async () => {
    const heat = await createHeat({ solo: true });
    expect(heat.heat_id).toMatch(/^heat_/);
    expect(heat.access_code).toMatch(/^SOLO-/);
    expect(heat.configuration.total_rounds).toBe(12);
  });

  it("multiplayer codes are 8 chars (QR classroom share)", async () => {
    const heat = await createHeat({ solo: false });
    expect(heat.access_code).toMatch(/^[A-Z2-9]{8}$/);
    expect(heat.access_code.startsWith("SOLO-")).toBe(false);
  });

  it("creates attempt with starting pipeline + player token", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt, player_token } = await createAttempt(heat.heat_id, {
      player_name: "Ava",
    });
    expect(attempt.status).toBe("playing");
    expect(attempt.current_round).toBe(1);
    expect(attempt.inventory).toBe(DEFAULT_CONFIG.starting_inventory);
    expect(attempt.pipeline).toEqual(DEFAULT_CONFIG.starting_pipeline_orders);
    expect(attempt.rounds).toHaveLength(0);
    expect(player_token.length).toBeGreaterThanOrEqual(32);
    // Token must not leak on public attempt payload
    expect(
      (attempt as { player_token?: string }).player_token,
    ).toBeUndefined();
  });

  it("joins by access code (QR / ?code= path)", async () => {
    const heat = await createHeat({ solo: false });
    const { attempt } = await createAttempt(heat.access_code, {
      player_name: "Bo",
    });
    expect(attempt.heat_id).toBe(heat.heat_id);
  });

  it("rejects when heat is full", async () => {
    const heat = await createHeat({ solo: true });
    await createAttempt(heat.heat_id, { player_name: "One" });
    await expect(
      createAttempt(heat.heat_id, { player_name: "Two" }),
    ).rejects.toMatchObject({ code: "HEAT_FULL" });
  });

  it("rejects second official attempt for same identity", async () => {
    const heat = await createHeat({ solo: false });
    await createAttempt(heat.heat_id, {
      player_name: "Ava",
      player_identity: "ava@example.com",
      is_official: true,
    });
    await expect(
      createAttempt(heat.heat_id, {
        player_name: "Ava again",
        player_identity: "ava@example.com",
        is_official: true,
      }),
    ).rejects.toMatchObject({ code: "ALREADY_ATTEMPTED" });
  });

  it("allows official attempt without identity (QR/access-code join)", async () => {
    const heat = await createHeat({ solo: false });
    const { attempt } = await createAttempt(heat.heat_id, {
      player_name: "Ava",
      is_official: true,
    });
    expect(attempt.player_name).toBe("Ava");
  });

  it("canonicalizes official identity case", async () => {
    const heat = await createHeat({ solo: false });
    await createAttempt(heat.heat_id, {
      player_name: "Ava",
      player_identity: "Ava@Example.com",
      is_official: true,
    });
    await expect(
      createAttempt(heat.heat_id, {
        player_name: "Ava 2",
        player_identity: "ava@example.com",
        is_official: true,
      }),
    ).rejects.toMatchObject({ code: "ALREADY_ATTEMPTED" });
  });

  it("allows practice retries without identity lock", async () => {
    const heat = await createHeat({ solo: false });
    await createAttempt(heat.heat_id, {
      player_name: "Ava",
      is_official: false,
      player_identity: "ava@example.com",
    });
    const { attempt: second } = await createAttempt(heat.heat_id, {
      player_name: "Ava 2",
      is_official: false,
      player_identity: "ava@example.com",
    });
    expect(second.player_name).toBe("Ava 2");
  });
});

describe("submitRound", () => {
  it("recomputes server-side and advances state", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt } = await createAttempt(heat.heat_id, { player_name: "Ava" });

    const res = await submitRound(attempt.attempt_id, {
      round: 1,
      placed_order: 6,
    });

    expect(res.accepted).toBe(true);
    expect(res.round_record.round).toBe(1);
    expect(res.round_record.placed_order).toBe(6);
    // pipeline start [4,4], delay 2, supply 1 → delivery 4
    expect(res.round_record.incoming_delivery).toBe(4);
    expect(res.round_record.customer_demand).toBe(4);
    expect(res.attempt.current_round).toBe(2);
    expect(res.attempt.rounds).toHaveLength(1);
    expect(res.live_heat_board).toHaveLength(1);
  });

  it("clamps order to max", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt } = await createAttempt(heat.heat_id, { player_name: "Ava" });
    const res = await submitRound(attempt.attempt_id, {
      round: 1,
      placed_order: DEFAULT_CONFIG.maximum_order + 1,
    });
    expect(res.round_record.placed_order).toBe(DEFAULT_CONFIG.maximum_order);
  });

  it("rejects round mismatch", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt } = await createAttempt(heat.heat_id, { player_name: "Ava" });
    await expect(
      submitRound(attempt.attempt_id, { round: 3, placed_order: 4 }),
    ).rejects.toMatchObject({ code: "ROUND_MISMATCH" });
  });

  it("rejects double-submit (round locked)", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt } = await createAttempt(heat.heat_id, { player_name: "Ava" });
    await submitRound(attempt.attempt_id, { round: 1, placed_order: 4 });
    await expect(
      submitRound(attempt.attempt_id, { round: 1, placed_order: 8 }),
    ).rejects.toMatchObject({ code: "ROUND_LOCKED" });
  });

  it("GET attempt restores mid-game state", async () => {
    const heat = await createHeat({ solo: true });
    const created = await createAttempt(heat.heat_id, { player_name: "Ava" });
    const after = await submitRound(created.attempt.attempt_id, {
      round: 1,
      placed_order: 5,
    });
    const loaded = getAttempt(created.attempt.attempt_id);
    expect(loaded.current_round).toBe(2);
    expect(loaded.inventory).toBe(after.attempt.inventory);
    expect(loaded.pipeline).toEqual(after.attempt.pipeline);
    expect(loaded.rounds).toHaveLength(1);
  });
});

describe("full game + report", () => {
  it("runs 12 rounds, completes, no round 13", async () => {
    const heat = await createHeat({ solo: true });
    let { attempt } = await createAttempt(heat.heat_id, { player_name: "Ava" });

    for (let r = 1; r <= 12; r++) {
      const res = await submitRound(attempt.attempt_id, {
        round: r,
        placed_order: 6,
      });
      attempt = res.attempt;
    }

    expect(attempt.status).toBe("completed");
    expect(attempt.rounds).toHaveLength(12);
    expect(attempt.current_round).toBe(12);

    await expect(
      submitRound(attempt.attempt_id, { round: 13, placed_order: 1 }),
    ).rejects.toBeInstanceOf(ApiError);

    const complete = await completeAttempt(attempt.attempt_id);
    expect(complete.report.final_cumulative_cost).toBe(attempt.cumulative_cost);
    expect(complete.heat_rank).toBe(1);
    expect(complete.heat_winner_cost).toBe(attempt.cumulative_cost);
  });
});

describe("leaderboards", () => {
  it("live sort prefers more completed rounds then lower cost", async () => {
    const heat = await createHeat({ solo: false });
    const { attempt: a } = await createAttempt(heat.heat_id, {
      player_name: "Fast",
    });
    const { attempt: b } = await createAttempt(heat.heat_id, {
      player_name: "Slow",
    });

    await submitRound(a.attempt_id, { round: 1, placed_order: 10 });
    await submitRound(a.attempt_id, { round: 2, placed_order: 10 });
    await submitRound(b.attempt_id, { round: 1, placed_order: 0 });

    const board = getHeatLeaderboard(heat.heat_id, "live");
    expect(board[0]!.player_name).toBe("Fast");
    expect(board[0]!.completed_round).toBe(2);
    expect(board[1]!.player_name).toBe("Slow");
  });

  it("global board only includes completed attempts", async () => {
    const heat = await createHeat({ solo: true });
    const { attempt: a } = await createAttempt(heat.heat_id, {
      player_name: "Done",
    });
    for (let r = 1; r <= 12; r++) {
      await submitRound(a.attempt_id, { round: r, placed_order: 5 });
    }
    const heat2 = await createHeat({ solo: true });
    await createAttempt(heat2.heat_id, { player_name: "Playing" });

    const global = getGlobalLeaderboard(DEFAULT_CONFIG.configuration_id);
    expect(global.every((row) => row.status === "completed")).toBe(true);
    expect(global.some((row) => row.player_name === "Done")).toBe(true);
    expect(global.some((row) => row.player_name === "Playing")).toBe(false);
  });
});

describe("admin controls", () => {
  it("compiles admin stats and data, handles status toggle, and deletion", async () => {
    const {
      getAdminStats,
      getAdminData,
      clearAdminData,
      toggleHeatStatus,
      deleteHeat,
    } = await import("../service");

    let stats = getAdminStats();
    expect(stats.heats).toBe(0);
    expect(stats.attempts).toBe(0);

    const heat = await createHeat({ solo: false });
    const { attempt } = await createAttempt(heat.heat_id, {
      player_name: "Admin Tester",
    });
    expect(attempt.player_name).toBe("Admin Tester");

    stats = getAdminStats();
    expect(stats.heats).toBe(1);
    expect(stats.attempts).toBe(1);
    expect(stats.playing).toBe(1);

    const data = getAdminData();
    expect(data.heats).toHaveLength(1);
    expect(data.heats[0]!.access_code).toBe(heat.access_code);
    expect(data.heats[0]!.status).toBe("open");
    expect(data.attempts).toHaveLength(1);
    expect(data.attempts[0]!.player_name).toBe("Admin Tester");

    const status = await toggleHeatStatus(heat.heat_id);
    expect(status).toBe("closed");
    expect(getAdminData().heats[0]!.status).toBe("closed");

    await expect(
      createAttempt(heat.heat_id, { player_name: "Late Player" }),
    ).rejects.toMatchObject({ code: "HEAT_NOT_FOUND" });

    await deleteHeat(heat.heat_id);
    stats = getAdminStats();
    expect(stats.heats).toBe(0);
    expect(stats.attempts).toBe(0);

    const heat2 = await createHeat({ solo: true });
    await createAttempt(heat2.heat_id, { player_name: "Clear Tester" });
    expect(getAdminStats().heats).toBe(1);
    await clearAdminData();
    expect(getAdminStats().heats).toBe(0);
  });
});
