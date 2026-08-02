"use client";

import {
  buildOpeningView,
  calculateReport,
  calculateRound,
  applyRoundToPipeline,
  clampOrder,
  demandForRound,
  fingerprintFromConfig,
  normalizePipeline,
  supplyRateForRound,
  type Attempt,
  type GameConfig,
  type LeaderboardRow,
  type RoundRecord,
} from "@/engine";
import { loadAdminConfig } from "@/lib/adminConfigStore";
import type {
  CompleteAttemptResponse,
  CreateAttemptRequest,
  CreateHeatRequest,
  CreateHeatResponse,
  RetailerChallengeApi,
  SubmitRoundRequest,
  SubmitRoundResponse,
} from "./types";

/** Active event config (admin overrides DEFAULT_CONFIG via localStorage). */
function activeConfig(): GameConfig {
  return loadAdminConfig();
}

const STORAGE_KEY = "retailer-challenge-v1";

interface HeatRecord {
  heat_id: string;
  access_code: string;
  configuration: GameConfig;
  attempt_ids: string[];
  created_at: string;
}

interface StoreShape {
  heats: Record<string, HeatRecord>;
  attempts: Record<string, Attempt>;
  codes: Record<string, string>; // access_code -> heat_id
  globalCompleted: string[]; // attempt ids
}

function emptyStore(): StoreShape {
  return { heats: {}, attempts: {}, codes: {}, globalCompleted: [] };
}

function load(): StoreShape {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) } as StoreShape;
  } catch {
    return emptyStore();
  }
}

function save(store: StoreShape) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function code() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function toLeaderboardRow(attempt: Attempt, position: number): LeaderboardRow {
  const fp = fingerprintFromConfig(attempt.configuration);
  const report =
    attempt.rounds.length > 0 ? calculateReport(attempt.rounds) : null;
  return {
    position,
    player_name: attempt.player_name,
    completed_round: attempt.rounds.length,
    cumulative_cost: attempt.cumulative_cost,
    status: attempt.status,
    completed_at: attempt.completed_at,
    ...fp,
    immediate_fill_rate: report?.immediate_demand_fill_rate,
    backlog_unit_weeks: report?.backlog_unit_weeks,
    order_volatility: report?.order_volatility,
  };
}

function sortLive(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .sort((a, b) => {
      if (b.completed_round !== a.completed_round) return b.completed_round - a.completed_round;
      if (a.cumulative_cost !== b.cumulative_cost) return a.cumulative_cost - b.cumulative_cost;
      const ta = a.completed_at ? Date.parse(a.completed_at) : Number.MAX_SAFE_INTEGER;
      const tb = b.completed_at ? Date.parse(b.completed_at) : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    })
    .map((r, i) => ({ ...r, position: i + 1 }));
}

function sortFinal(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .filter((r) => r.status === "completed")
    .sort((a, b) => {
      if (a.cumulative_cost !== b.cumulative_cost) return a.cumulative_cost - b.cumulative_cost;
      const buA = a.backlog_unit_weeks ?? 0;
      const buB = b.backlog_unit_weeks ?? 0;
      if (buA !== buB) return buA - buB;
      const ovA = a.order_volatility ?? 0;
      const ovB = b.order_volatility ?? 0;
      if (ovA !== ovB) return ovA - ovB;
      const ta = a.completed_at ? Date.parse(a.completed_at) : 0;
      const tb = b.completed_at ? Date.parse(b.completed_at) : 0;
      return ta - tb;
    })
    .map((r, i) => ({ ...r, position: i + 1 }));
}

function heatBoard(store: StoreShape, heatId: string, mode: "live" | "final"): LeaderboardRow[] {
  const heat = store.heats[heatId];
  if (!heat) return [];
  const attempts = heat.attempt_ids
    .map((id) => store.attempts[id])
    .filter(Boolean) as Attempt[];
  const rows = attempts.map((a, i) => toLeaderboardRow(a, i + 1));
  return mode === "final" ? sortFinal(rows) : sortLive(rows);
}

function processOrder(attempt: Attempt, placedOrder: number): { attempt: Attempt; record: RoundRecord } {
  const config = attempt.configuration;
  const round = attempt.current_round;
  if (round > config.total_rounds) {
    throw new Error("Game already complete");
  }
  if (attempt.rounds.some((r) => r.round === round)) {
    throw new Error("Round already locked");
  }

  const order = clampOrder(placedOrder, config);
  const pipeline = normalizePipeline(attempt.pipeline, config.delivery_delay);
  const scheduledOrder = pipeline[0] ?? 0;
  const supplyRate = supplyRateForRound(config, round);
  const customerDemand = demandForRound(config, round);

  const record = calculateRound({
    round,
    openingInventory: attempt.inventory,
    openingBacklog: attempt.backlog,
    scheduledOrder,
    supplyRate,
    customerDemand,
    inventoryCostPerUnit: config.inventory_cost_per_unit,
    backlogCostPerUnit: config.backlog_cost_per_unit,
    previousCumulativeCost: attempt.cumulative_cost,
    placedOrder: order,
  });

  const nextPipeline = applyRoundToPipeline(pipeline, config.delivery_delay, order);
  const nextRound = round + 1;
  const completed = nextRound > config.total_rounds;

  const next: Attempt = {
    ...attempt,
    inventory: record.ending_inventory,
    backlog: record.ending_backlog,
    cumulative_cost: record.cumulative_cost,
    pipeline: nextPipeline,
    rounds: [...attempt.rounds, record],
    current_round: completed ? config.total_rounds : nextRound,
    status: completed ? "completed" : "playing",
    completed_at: completed ? record.completed_at : undefined,
  };

  return { attempt: next, record };
}

export const mockAdapter: RetailerChallengeApi = {
  async getConfiguration() {
    return activeConfig();
  },

  async createHeat(body: CreateHeatRequest): Promise<CreateHeatResponse> {
    const store = load();
    const configuration = activeConfig();
    const heat_id = id("heat");
    const access_code = body.solo ? `SOLO-${code()}` : code();
    store.heats[heat_id] = {
      heat_id,
      access_code,
      configuration,
      attempt_ids: [],
      created_at: new Date().toISOString(),
    };
    store.codes[access_code] = heat_id;
    save(store);
    return { heat_id, access_code, configuration };
  },

  async createAttempt(heatId: string, body: CreateAttemptRequest): Promise<Attempt> {
    const store = load();
    let heat = store.heats[heatId];
    if (!heat) {
      // allow join by access code
      const byCode = store.codes[heatId] ?? store.codes[heatId.toUpperCase()];
      if (byCode) heat = store.heats[byCode];
    }
    if (!heat) throw new Error("Heat not found");

    const config = heat.configuration;
    const active = heat.attempt_ids
      .map((aid) => store.attempts[aid])
      .filter(Boolean);
    if (active.length >= config.maximum_players_per_heat) {
      throw new Error(
        `Heat is full (max ${config.maximum_players_per_heat} players)`,
      );
    }

    const attempt_id = id("att");
    const attempt: Attempt = {
      attempt_id,
      heat_id: heat.heat_id,
      player_name: body.player_name.trim() || "Player",
      configuration: config,
      status: "playing",
      current_round: 1,
      pipeline: normalizePipeline(config.starting_pipeline_orders, config.delivery_delay),
      inventory: config.starting_inventory,
      backlog: config.starting_backlog,
      cumulative_cost: 0,
      rounds: [],
      started_at: new Date().toISOString(),
    };
    store.attempts[attempt_id] = attempt;
    heat.attempt_ids.push(attempt_id);
    save(store);
    return attempt;
  },

  async getAttempt(attemptId: string) {
    const store = load();
    return store.attempts[attemptId] ?? null;
  },

  async submitRound(attemptId: string, body: SubmitRoundRequest): Promise<SubmitRoundResponse> {
    const store = load();
    const attempt = store.attempts[attemptId];
    if (!attempt) throw new Error("Attempt not found");
    if (attempt.status === "completed") throw new Error("Attempt completed");
    if (body.round !== attempt.current_round) {
      throw new Error(`Expected round ${attempt.current_round}, got ${body.round}`);
    }

    const { attempt: next, record } = processOrder(attempt, body.placed_order);
    store.attempts[attemptId] = next;
    if (next.status === "completed") {
      store.globalCompleted.push(attemptId);
    }
    save(store);

    return {
      accepted: true,
      round_record: record,
      attempt: next,
      live_heat_board: heatBoard(store, next.heat_id, "live"),
    };
  },

  async completeAttempt(attemptId: string): Promise<CompleteAttemptResponse> {
    const store = load();
    const attempt = store.attempts[attemptId];
    if (!attempt) throw new Error("Attempt not found");
    const report = calculateReport(attempt.rounds);
    const heat = store.heats[attempt.heat_id];
    const allDone =
      !!heat &&
      heat.attempt_ids.every((aid) => store.attempts[aid]?.status === "completed");
    const board = heatBoard(store, attempt.heat_id, allDone ? "final" : "live");
    // Rank by attempt id (unique) not display name
    const heat_rank =
      board.find((r) => {
        const match = heat?.attempt_ids
          .map((aid) => store.attempts[aid])
          .find(
            (a) =>
              a &&
              a.player_name === r.player_name &&
              a.cumulative_cost === r.cumulative_cost &&
              a.completed_at === r.completed_at,
          );
        return match?.attempt_id === attemptId;
      })?.position ??
      board.find((r) => r.player_name === attempt.player_name)?.position ??
      null;
    const global = await this.getGlobalLeaderboard(attempt.configuration.configuration_id);
    const global_rank =
      global.find(
        (r) =>
          r.player_name === attempt.player_name &&
          r.completed_at === attempt.completed_at &&
          r.cumulative_cost === attempt.cumulative_cost,
      )?.position ?? null;

    return {
      attempt,
      report,
      heat_rank,
      global_rank,
      live_heat_board: heatBoard(store, attempt.heat_id, allDone ? "final" : "live"),
    };
  },

  async getHeatLeaderboard(heatId: string, mode: "live" | "final") {
    const store = load();
    // resolve code
    const id = store.heats[heatId] ? heatId : store.codes[heatId];
    if (!id) return [];
    return heatBoard(store, store.heats[id] ? id : heatId, mode);
  },

  async getGlobalLeaderboard(configurationId: string) {
    const store = load();
    const attempts = store.globalCompleted
      .map((id) => store.attempts[id])
      .filter(
        (a): a is Attempt =>
          !!a &&
          a.status === "completed" &&
          a.configuration.configuration_id === configurationId,
      );
    const rows = attempts.map((a, i) => toLeaderboardRow(a, i + 1));
    return sortFinal(rows);
  },
};

/** Join heat by access code — mock helper. */
export async function resolveHeatByCode(accessCode: string): Promise<HeatRecord | null> {
  const store = load();
  const heatId = store.codes[accessCode.toUpperCase()] ?? store.codes[accessCode];
  if (!heatId) return null;
  return store.heats[heatId] ?? null;
}

export function getOpeningPreview(attempt: Attempt) {
  const config = attempt.configuration;
  const round = attempt.current_round;
  return buildOpeningView({
    round,
    inventory: attempt.inventory,
    backlog: attempt.backlog,
    pipeline: attempt.pipeline,
    deliveryDelay: config.delivery_delay,
    supplyRate: supplyRateForRound(config, round),
    customerDemand: demandForRound(config, round),
    previousCumulativeCost: attempt.cumulative_cost,
  });
}
