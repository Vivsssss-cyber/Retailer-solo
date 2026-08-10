"use client";

import {
  buildOpeningView,
  calculateReport,
  calculateRound,
  applyRoundToPipeline,
  clampOrder,
  demandForRound,
  fingerprintFromConfig,
  migrateGameConfig,
  normalizePipeline,
  supplyRateForRound,
  type Attempt,
  type GameConfig,
  type LeaderboardRow,
  type RoundRecord,
} from "@/engine";
import {
  isAdminUnlocked,
  loadAdminConfig,
  saveAdminConfig,
} from "@/lib/adminConfigStore";
import { persistPlayerToken, readPlayerToken } from "@/lib/playerTokenStore";
import type {
  AdminCreateRoomRequest,
  CompleteAttemptResponse,
  CreateAttemptRequest,
  CreateAttemptResponse,
  CreateHeatRequest,
  CreateHeatResponse,
  HeatSummary,
  RetailerChallengeApi,
  SubmitRoundRequest,
  SubmitRoundResponse,
} from "./types";
import { codeIndexKey, normalizeHeatKey } from "@/lib/heatKey";
import { errorWithCode } from "./apiErrors";

/** Mock-only fields for official one-attempt enforcement. */
type MockAttempt = Attempt & {
  is_official?: boolean;
  player_identity?: string | null;
  player_token?: string;
};

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
  status?: "open" | "closed";
}

interface StoreShape {
  heats: Record<string, HeatRecord>;
  attempts: Record<string, MockAttempt>;
  codes: Record<string, string>; // access_code -> heat_id
  globalCompleted: string[]; // attempt ids
}

function emptyStore(): StoreShape {
  return { heats: {}, attempts: {}, codes: {}, globalCompleted: [] };
}

function migrateStore(store: StoreShape): StoreShape {
  let changed = false;
  for (const heat of Object.values(store.heats)) {
    const next = migrateGameConfig(heat.configuration);
    if (next.maximum_order !== heat.configuration.maximum_order) {
      heat.configuration = next;
      changed = true;
    }
  }
  for (const attempt of Object.values(store.attempts)) {
    const next = migrateGameConfig(attempt.configuration);
    if (next.maximum_order !== attempt.configuration.maximum_order) {
      attempt.configuration = next;
      changed = true;
    }
  }
  if (changed) save(store);
  return store;
}

function load(): StoreShape {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return migrateStore({ ...emptyStore(), ...JSON.parse(raw) } as StoreShape);
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

/** Multiplayer: 8 chars; solo uses SOLO- + 6. */
function code(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

function playerToken(): string {
  return `mock_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function assertMockPlayerToken(attempt: MockAttempt): void {
  const expected = attempt.player_token;
  if (!expected) return; // legacy mock rows before token field
  const got = readPlayerToken(attempt.attempt_id);
  if (!got || got !== expected) {
    throw errorWithCode(
      "FORBIDDEN",
      "Missing or invalid player token for this attempt.",
    );
  }
}

function toPublicAttempt(a: MockAttempt): Attempt {
  return {
    attempt_id: a.attempt_id,
    heat_id: a.heat_id,
    player_name: a.player_name,
    configuration: migrateGameConfig(a.configuration),
    status: a.status,
    current_round: a.current_round,
    pipeline: a.pipeline,
    inventory: a.inventory,
    backlog: a.backlog,
    cumulative_cost: a.cumulative_cost,
    rounds: a.rounds,
    started_at: a.started_at,
    completed_at: a.completed_at,
  };
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
  const config = migrateGameConfig(attempt.configuration);
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
    configuration: config,
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

  async putConfiguration(config) {
    return saveAdminConfig(config);
  },

  async createHeat(body: CreateHeatRequest): Promise<CreateHeatResponse> {
    // Player-facing create is solo-only. Multiplayer groups use adminCreateRoom.
    const solo = body.solo === true;
    const store = load();
    const configuration = activeConfig();
    if (solo) {
      if (!configuration.solo_practice_enabled) {
        throw errorWithCode(
          "BAD_REQUEST",
          "Solo practice is turned off. Join a group with the access code from your host.",
        );
      }
    } else if (!isAdminUnlocked()) {
      throw errorWithCode(
        "UNAUTHORIZED",
        "Only an unlocked admin can create a classroom group.",
      );
    }
    const heat_id = id("heat");
    const access_code = solo ? `SOLO-${code(6)}` : code(8);
    store.heats[heat_id] = {
      heat_id,
      access_code,
      configuration,
      attempt_ids: [],
      created_at: new Date().toISOString(),
      status: "open",
    };
    store.codes[codeIndexKey(access_code)] = heat_id;
    save(store);
    return { heat_id, access_code, configuration };
  },

  async adminCreateRoom(body: AdminCreateRoomRequest = {}): Promise<CreateHeatResponse> {
    // Mock has no real auth — admin UI is already PIN-gated in the browser.
    return this.createHeat({ solo: false, player_name: body.player_name });
  },

  async getHeat(heatIdOrCode: string): Promise<HeatSummary> {
    const store = load();
    const key = normalizeHeatKey(heatIdOrCode);
    let heat = store.heats[key] ?? store.heats[heatIdOrCode.trim()];
    if (!heat) {
      const byCode =
        store.codes[key] ??
        store.codes[codeIndexKey(heatIdOrCode)] ??
        store.codes[heatIdOrCode.trim()] ??
        store.codes[heatIdOrCode.trim().toUpperCase()];
      if (byCode) heat = store.heats[byCode];
    }
    if (!heat) {
      throw errorWithCode(
        "HEAT_NOT_FOUND",
        "Room not found. In mock mode, the code only works in this same browser.",
      );
    }
    const maxPlayers = heat.access_code.startsWith("SOLO-")
      ? 1
      : heat.configuration.maximum_players_per_heat;
    return {
      heat_id: heat.heat_id,
      access_code: heat.access_code,
      configuration: heat.configuration,
      attempt_count: heat.attempt_ids.length,
      max_players: maxPlayers,
      status: heat.status ?? "open",
    };
  },

  async createAttempt(
    heatId: string,
    body: CreateAttemptRequest,
  ): Promise<CreateAttemptResponse> {
    const store = load();
    const key = normalizeHeatKey(heatId);
    let heat = store.heats[key] ?? store.heats[heatId.trim()];
    if (!heat) {
      // allow join by access code (case/space insensitive) — same as QR ?code=
      const byCode =
        store.codes[key] ??
        store.codes[codeIndexKey(heatId)] ??
        store.codes[heatId.trim()] ??
        store.codes[heatId.trim().toUpperCase()];
      if (byCode) heat = store.heats[byCode];
    }
    if (!heat) {
      throw errorWithCode(
        "HEAT_NOT_FOUND",
        "Heat not found. In mock mode, the code only works in this same browser. For multiplayer across devices, set NEXT_PUBLIC_USE_MOCK=false.",
      );
    }
    if (heat.status === "closed") {
      throw errorWithCode("HEAT_NOT_FOUND", "Heat is closed");
    }

    const config = heat.configuration;
    const active = heat.attempt_ids
      .map((aid) => store.attempts[aid])
      .filter((a): a is MockAttempt => !!a);

    // Solo heats use max 1; multiplayer uses config max (host path creates non-SOLO codes).
    const maxPlayers = heat.access_code.startsWith("SOLO-")
      ? 1
      : config.maximum_players_per_heat;
    if (active.length >= maxPlayers) {
      throw errorWithCode(
        "HEAT_FULL",
        `Heat is full (max ${maxPlayers} players)`,
      );
    }

    const isOfficial = body.is_official === true;
    let identity = body.player_identity?.trim() || null;
    if (identity) identity = identity.toLowerCase();
    if (isOfficial && identity) {
      const dup = active.find(
        (a) =>
          a.is_official &&
          a.player_identity?.toLowerCase() === identity,
      );
      if (dup) {
        throw errorWithCode(
          "ALREADY_ATTEMPTED",
          "An official attempt already exists for this identity",
        );
      }
    }

    const attempt_id = id("att");
    const token = playerToken();
    const attempt: MockAttempt = {
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
      is_official: isOfficial,
      player_identity: identity,
      player_token: token,
    };
    store.attempts[attempt_id] = attempt;
    heat.attempt_ids.push(attempt_id);
    save(store);
    persistPlayerToken(attempt_id, token);
    return { attempt: toPublicAttempt(attempt), player_token: token };
  },

  async getAttempt(attemptId: string) {
    const store = load();
    const a = store.attempts[attemptId];
    if (!a) return null;
    assertMockPlayerToken(a);
    return toPublicAttempt(a);
  },

  async submitRound(attemptId: string, body: SubmitRoundRequest): Promise<SubmitRoundResponse> {
    const store = load();
    const attempt = store.attempts[attemptId];
    if (!attempt) throw errorWithCode("ATTEMPT_NOT_FOUND", "Attempt not found");
    assertMockPlayerToken(attempt);
    if (attempt.status === "completed") {
      throw errorWithCode("ATTEMPT_COMPLETED", "Attempt completed");
    }
    if (body.round !== attempt.current_round) {
      if (attempt.rounds.some((r) => r.round === body.round)) {
        throw errorWithCode("ROUND_LOCKED", `Round ${body.round} already submitted`);
      }
      throw errorWithCode(
        "ROUND_MISMATCH",
        `Expected round ${attempt.current_round}, got ${body.round}`,
      );
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
    assertMockPlayerToken(attempt);
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

  async adminLogin(_pin: string) {
    return { ok: true as const };
  },

  async adminLogout() {
    return { ok: true as const };
  },

  async getAdminData() {
    const store = load();
    const heats = Object.values(store.heats ?? {}).map((h) => ({
      heat_id: h.heat_id,
      access_code: h.access_code,
      created_at: h.created_at,
      players: h.attempt_ids?.length ?? 0,
      config_id: h.configuration?.configuration_id ?? "—",
      version: h.configuration?.configuration_version ?? 0,
      status: h.status ?? "open",
    }));
    const attempts = Object.values(store.attempts ?? {}).map((a) => ({
      attempt_id: a.attempt_id,
      player_name: a.player_name,
      heat_id: a.heat_id,
      status: a.status,
      round: a.current_round,
      cost: a.cumulative_cost,
      started_at: a.started_at,
    }));
    const attemptList = Object.values(store.attempts ?? {});
    const stats = {
      heats: Object.keys(store.heats ?? {}).length,
      attempts: attemptList.length,
      completed: attemptList.filter((a) => a.status === "completed").length,
      playing: attemptList.filter((a) => a.status === "playing").length,
    };
    return { heats, attempts, stats };
  },

  async clearAdminData() {
    const store = emptyStore();
    save(store);
  },

  async toggleHeatStatus(heatId: string) {
    const store = load();
    const heat = store.heats[heatId];
    if (!heat) throw errorWithCode("HEAT_NOT_FOUND", "Heat not found");
    heat.status = heat.status === "closed" ? "open" : "closed";
    save(store);
    return { status: heat.status };
  },

  async deleteHeat(heatId: string) {
    const store = load();
    const heat = store.heats[heatId];
    if (!heat) throw errorWithCode("HEAT_NOT_FOUND", "Heat not found");
    for (const attId of heat.attempt_ids) {
      delete store.attempts[attId];
      const idx = store.globalCompleted.indexOf(attId);
      if (idx > -1) store.globalCompleted.splice(idx, 1);
    }
    const codeKey = codeIndexKey(heat.access_code);
    delete store.codes[codeKey];
    delete store.heats[heatId];
    save(store);
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
