import {
  applyRoundToPipeline,
  calculateReport,
  calculateRound,
  clampOrder,
  demandForRound,
  DEFAULT_CONFIG,
  migrateGameConfig,
  normalizePipeline,
  supplyRateForRound,
  type Attempt,
  type GameConfig,
  type LeaderboardRow,
  type PerformanceReport,
  type RoundRecord,
} from "@/engine";
import { ApiError } from "./errors";
import { makeAccessCode, makeId, makePlayerToken } from "./ids";
import {
  heatBoard,
  rankForAttempt,
  sortFinal,
  toLeaderboardRow,
} from "./leaderboard";
import { codeIndexKey, normalizeHeatKey } from "@/lib/heatKey";
import { DEFAULT_EVENT_ID, updateStore, withStore } from "./store";
import type { HeatRecord, ServerAttempt } from "./types";

// ─── helpers ───────────────────────────────────────────────────────────────

function publicAttempt(a: ServerAttempt): Attempt {
  // Strip server-only fields for client contract
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

function resolveHeatId(store: {
  heats: Record<string, HeatRecord>;
  codes: Record<string, string>;
}, heatIdOrCode: string): HeatRecord | null {
  const key = normalizeHeatKey(heatIdOrCode);
  if (!key) return null;
  if (store.heats[key]) return store.heats[key]!;
  // raw id (in case heat_ casing differed only in prefix handling)
  if (store.heats[heatIdOrCode.trim()]) return store.heats[heatIdOrCode.trim()]!;
  const byCode =
    store.codes[key] ??
    store.codes[codeIndexKey(heatIdOrCode)] ??
    store.codes[heatIdOrCode.trim()];
  if (byCode && store.heats[byCode]) return store.heats[byCode]!;
  return null;
}

function heatAttempts(
  store: { attempts: Record<string, ServerAttempt> },
  heat: HeatRecord,
): ServerAttempt[] {
  return heat.attempt_ids
    .map((id) => store.attempts[id])
    .filter((a): a is ServerAttempt => !!a);
}

function uniqueAccessCode(codes: Record<string, string>, solo: boolean): string {
  // Solo: shorter SOLO-XXXXXX; multiplayer classroom: 8-char codes for QR/share.
  const len = solo ? 6 : 8;
  for (let i = 0; i < 20; i++) {
    const raw = makeAccessCode(len);
    const code = solo ? `SOLO-${raw}` : raw;
    if (!codes[codeIndexKey(code)]) return code;
  }
  // Extremely unlikely fallback
  return `X${Date.now().toString(36).toUpperCase()}`;
}

function processOrder(
  attempt: ServerAttempt,
  placedOrder: number,
): { attempt: ServerAttempt; record: RoundRecord } {
  const config = migrateGameConfig(attempt.configuration);
  const round = attempt.current_round;

  if (attempt.status === "completed" || round > config.total_rounds) {
    throw new ApiError("ATTEMPT_COMPLETED", "Attempt already completed");
  }
  if (attempt.rounds.some((r) => r.round === round)) {
    throw new ApiError("ROUND_LOCKED", `Round ${round} already submitted`);
  }

  if (!Number.isFinite(placedOrder)) {
    throw new ApiError("INVALID_ORDER", "placed_order must be a finite number");
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

  const next: ServerAttempt = {
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

// ─── public API ────────────────────────────────────────────────────────────

export function getHealth(): { ok: true; service: string } {
  return { ok: true, service: "retailer-challenge" };
}

export function getConfiguration(configurationId: string): GameConfig {
  return withStore((store) => {
    const id = configurationId || "default";
    const config =
      store.configurations[id] ??
      store.configurations[DEFAULT_CONFIG.configuration_id] ??
      (id === "default" ? DEFAULT_CONFIG : null);
    if (!config) {
      throw new ApiError("CONFIG_NOT_FOUND", `Configuration not found: ${id}`);
    }
    return structuredClone(config);
  });
}

export function getEventConfiguration(eventId: string): GameConfig {
  return withStore((store) => {
    const event = store.events[eventId] ?? store.events[DEFAULT_EVENT_ID];
    if (!event) {
      throw new ApiError("EVENT_NOT_FOUND", `Event not found: ${eventId}`);
    }
    const config = store.configurations[event.configuration_id];
    if (!config) {
      throw new ApiError(
        "CONFIG_NOT_FOUND",
        `Configuration for event ${eventId} missing`,
      );
    }
    return structuredClone(config);
  });
}

export interface CreateHeatBody {
  event_id?: string;
  configuration_id?: string;
  solo?: boolean;
  host_player_name?: string;
  player_name?: string;
}

export interface CreateHeatResult {
  heat_id: string;
  access_code: string;
  configuration: GameConfig;
}

export async function createHeat(body: CreateHeatBody): Promise<CreateHeatResult> {
  return updateStore((store) => {
    const configId =
      body.configuration_id ??
      (body.event_id
        ? store.events[body.event_id]?.configuration_id
        : undefined) ??
      DEFAULT_CONFIG.configuration_id;

    const base =
      store.configurations[configId] ??
      store.configurations["default"] ??
      DEFAULT_CONFIG;

    const configuration = structuredClone(base);
    const heat_id = makeId("heat");
    const solo = body.solo === true;
    const access_code = uniqueAccessCode(store.codes, solo);

    const heat: HeatRecord = {
      heat_id,
      access_code,
      event_id: body.event_id ?? null,
      configuration_id: configuration.configuration_id,
      configuration_version: configuration.configuration_version,
      configuration,
      max_players: solo
        ? Math.min(1, configuration.maximum_players_per_heat)
        : configuration.maximum_players_per_heat,
      attempt_ids: [],
      status: "open",
      created_at: new Date().toISOString(),
      solo,
    };

    // Solo heats still allow "invite later" style: use config max if not strictly solo-only
    // Docs: solo:true → max 1 is OK. Keep max_players = 1 for solo.
    if (solo) heat.max_players = 1;

    store.heats[heat_id] = heat;
    store.codes[codeIndexKey(access_code)] = heat_id;

    return {
      heat_id,
      access_code,
      configuration: structuredClone(configuration),
    };
  });
}

export function getHeat(heatIdOrCode: string): {
  heat_id: string;
  access_code: string;
  configuration: GameConfig;
  attempt_count: number;
  max_players: number;
  status: "open" | "closed";
} {
  return withStore((store) => {
    const heat = resolveHeatId(store, heatIdOrCode);
    if (!heat) {
      throw new ApiError("HEAT_NOT_FOUND", `Heat not found: ${heatIdOrCode}`);
    }
    return {
      heat_id: heat.heat_id,
      access_code: heat.access_code,
      configuration: structuredClone(heat.configuration),
      attempt_count: heat.attempt_ids.length,
      max_players: heat.max_players,
      status: heat.status,
    };
  });
}

export interface CreateAttemptBody {
  player_name: string;
  player_identity?: string;
  is_official?: boolean;
}

export interface CreateAttemptResult {
  attempt: Attempt;
  /** Shown once — client must store and send as X-Player-Token. */
  player_token: string;
}

export async function createAttempt(
  heatIdOrCode: string,
  body: CreateAttemptBody,
): Promise<CreateAttemptResult> {
  return updateStore((store) => {
    const heat = resolveHeatId(store, heatIdOrCode);
    if (!heat) {
      throw new ApiError("HEAT_NOT_FOUND", `Heat not found: ${heatIdOrCode}`);
    }
    if (heat.status === "closed") {
      throw new ApiError("HEAT_NOT_FOUND", "Heat is closed");
    }

    const active = heatAttempts(store, heat);
    if (active.length >= heat.max_players) {
      throw new ApiError(
        "HEAT_FULL",
        `Heat is full (max ${heat.max_players} players)`,
      );
    }

    // Soft identity lock only when client supplies one (optional).
    // Room gate is access_code + QR — not email OTP.
    const identity = body.player_identity?.trim() || null;
    const isOfficial = body.is_official === true;
    if (isOfficial && identity) {
      const dup = active.find(
        (a) => a.is_official && a.player_identity === identity,
      );
      if (dup) {
        throw new ApiError(
          "ALREADY_ATTEMPTED",
          "An official attempt already exists for this identity",
        );
      }
    }

    const config = heat.configuration;
    const attempt_id = makeId("att");
    const name = (body.player_name ?? "").trim() || "Player";
    const player_token = makePlayerToken();

    const attempt: ServerAttempt = {
      attempt_id,
      heat_id: heat.heat_id,
      player_name: name,
      configuration: structuredClone(config),
      status: "playing",
      current_round: 1,
      pipeline: normalizePipeline(
        config.starting_pipeline_orders,
        config.delivery_delay,
      ),
      inventory: config.starting_inventory,
      backlog: config.starting_backlog,
      cumulative_cost: 0,
      rounds: [],
      started_at: new Date().toISOString(),
      event_id: heat.event_id,
      is_official: isOfficial,
      player_identity: identity,
      player_token,
    };

    store.attempts[attempt_id] = attempt;
    heat.attempt_ids.push(attempt_id);

    return {
      attempt: publicAttempt(attempt),
      player_token,
    };
  });
}

export function getAttempt(attemptId: string): Attempt {
  return withStore((store) => {
    const attempt = store.attempts[attemptId];
    if (!attempt) {
      throw new ApiError("ATTEMPT_NOT_FOUND", `Attempt not found: ${attemptId}`);
    }
    return publicAttempt(attempt);
  });
}

export interface SubmitRoundBody {
  round: number;
  placed_order: number;
}

export interface SubmitRoundResult {
  accepted: boolean;
  round_record: RoundRecord;
  attempt: Attempt;
  live_heat_board: LeaderboardRow[];
}

export async function submitRound(
  attemptId: string,
  body: SubmitRoundBody,
): Promise<SubmitRoundResult> {
  return updateStore((store) => {
    const attempt = store.attempts[attemptId];
    if (!attempt) {
      throw new ApiError("ATTEMPT_NOT_FOUND", `Attempt not found: ${attemptId}`);
    }
    if (attempt.status === "completed") {
      throw new ApiError("ATTEMPT_COMPLETED", "Attempt already completed");
    }
    if (body.round !== attempt.current_round) {
      // Already have this round → locked; wrong future/past → mismatch
      if (attempt.rounds.some((r) => r.round === body.round)) {
        throw new ApiError("ROUND_LOCKED", `Round ${body.round} already submitted`);
      }
      throw new ApiError(
        "ROUND_MISMATCH",
        `Expected round ${attempt.current_round}, got ${body.round}`,
      );
    }

    const { attempt: next, record } = processOrder(attempt, body.placed_order);
    store.attempts[attemptId] = next;

    if (next.status === "completed" && !store.globalCompleted.includes(attemptId)) {
      store.globalCompleted.push(attemptId);
    }

    const heat = store.heats[next.heat_id];
    const board = heat
      ? heatBoard(heatAttempts(store, heat), "live")
      : [];

    return {
      accepted: true,
      round_record: record,
      attempt: publicAttempt(next),
      live_heat_board: board,
    };
  });
}

export interface CompleteAttemptResult {
  attempt: Attempt;
  report: PerformanceReport;
  heat_rank: number | null;
  global_rank: number | null;
  live_heat_board: LeaderboardRow[];
  heat_winner_cost: number | null;
}

export async function completeAttempt(
  attemptId: string,
): Promise<CompleteAttemptResult> {
  return updateStore((store) => {
    const attempt = store.attempts[attemptId];
    if (!attempt) {
      throw new ApiError("ATTEMPT_NOT_FOUND", `Attempt not found: ${attemptId}`);
    }

    // Idempotent: if still playing but all rounds done, mark completed
    if (
      attempt.status === "playing" &&
      attempt.rounds.length >= attempt.configuration.total_rounds
    ) {
      attempt.status = "completed";
      attempt.completed_at =
        attempt.completed_at ??
        attempt.rounds[attempt.rounds.length - 1]?.completed_at ??
        new Date().toISOString();
      if (!store.globalCompleted.includes(attemptId)) {
        store.globalCompleted.push(attemptId);
      }
    }

    const report = calculateReport(attempt.rounds);
    const heat = store.heats[attempt.heat_id];
    const peers = heat ? heatAttempts(store, heat) : [attempt];
    const allDone = peers.every((a) => a.status === "completed");
    const board = heatBoard(peers, allDone ? "final" : "live");

    const heat_rank = rankForAttempt(board, attempt);

    const completedPeers = peers.filter((a) => a.status === "completed");
    const heat_winner_cost =
      completedPeers.length > 0
        ? Math.min(...completedPeers.map((a) => a.cumulative_cost))
        : null;

    // Global rank among official-or-all completed with same config fingerprint
    const globalRows = buildGlobalRows(store, attempt.configuration.configuration_id);
    const global_rank = rankForAttempt(globalRows, attempt);

    return {
      attempt: publicAttempt(attempt),
      report,
      heat_rank,
      global_rank,
      live_heat_board: board,
      heat_winner_cost,
    };
  });
}

function buildGlobalRows(
  store: {
    attempts: Record<string, ServerAttempt>;
    globalCompleted: string[];
  },
  configurationId: string,
  options?: { officialOnly?: boolean },
): LeaderboardRow[] {
  const officialOnly = options?.officialOnly ?? false;
  const attempts = store.globalCompleted
    .map((id) => store.attempts[id])
    .filter((a): a is ServerAttempt => {
      if (!a || a.status !== "completed") return false;
      if (a.configuration.configuration_id !== configurationId) return false;
      if (officialOnly && !a.is_official) return false;
      return true;
    });
  const rows = attempts.map((a, i) => toLeaderboardRow(a, i + 1));
  return sortFinal(rows).slice(0, 100);
}

export function getHeatLeaderboard(
  heatIdOrCode: string,
  mode: "live" | "final",
): LeaderboardRow[] {
  return withStore((store) => {
    const heat = resolveHeatId(store, heatIdOrCode);
    if (!heat) {
      throw new ApiError("HEAT_NOT_FOUND", `Heat not found: ${heatIdOrCode}`);
    }
    return heatBoard(heatAttempts(store, heat), mode);
  });
}

export function getGlobalLeaderboard(
  configurationId: string,
  options?: { officialOnly?: boolean },
): LeaderboardRow[] {
  return withStore((store) =>
    buildGlobalRows(store, configurationId, options),
  );
}

/**
 * Admin upsert: normalize, store under id, and set as active default
 * so new heats snapshot this config.
 */
export async function upsertConfiguration(
  config: GameConfig,
  opts?: { makeDefault?: boolean },
): Promise<GameConfig> {
  // Lazy import avoids circular deps; normalize is pure.
  const { normalizeGameConfig } = await import("@/lib/adminConfigStore");
  return updateStore((store) => {
    const next = normalizeGameConfig(config);
    store.configurations[next.configuration_id] = structuredClone(next);

    const makeDefault = opts?.makeDefault !== false;
    if (makeDefault) {
      store.configurations["default"] = structuredClone(next);
      const ev = store.events[DEFAULT_EVENT_ID];
      if (ev) {
        ev.configuration_id = next.configuration_id;
      } else {
        store.events[DEFAULT_EVENT_ID] = {
          event_id: DEFAULT_EVENT_ID,
          name: "Default event",
          configuration_id: next.configuration_id,
        };
      }
    } else if (next.configuration_id === DEFAULT_CONFIG.configuration_id) {
      store.configurations["default"] = structuredClone(next);
    }

    return structuredClone(next);
  });
}

/** Reset active config to EU seed. */
export async function resetConfigurationToDefault(): Promise<GameConfig> {
  return upsertConfiguration(structuredClone(DEFAULT_CONFIG), { makeDefault: true });
}

export interface AdminStats {
  heats: number;
  attempts: number;
  completed: number;
  playing: number;
}

export interface AdminHeatRow {
  heat_id: string;
  access_code: string;
  created_at: string;
  players: number;
  config_id: string;
  version: number;
  status: "open" | "closed";
}

export interface AdminAttemptRow {
  attempt_id: string;
  player_name: string;
  heat_id: string;
  status: string;
  round: number;
  cost: number;
  started_at: string;
}

export interface AdminData {
  heats: AdminHeatRow[];
  attempts: AdminAttemptRow[];
}

export function getAdminStats(): AdminStats {
  return withStore((store) => {
    const attempts = Object.values(store.attempts ?? {});
    return {
      heats: Object.keys(store.heats ?? {}).length,
      attempts: attempts.length,
      completed: attempts.filter((a) => a.status === "completed").length,
      playing: attempts.filter((a) => a.status === "playing").length,
    };
  });
}

export function getAdminData(): AdminData {
  return withStore((store) => {
    const heats = Object.values(store.heats ?? {}).map((h) => ({
      heat_id: h.heat_id,
      access_code: h.access_code,
      created_at: h.created_at,
      players: h.attempt_ids?.length ?? 0,
      config_id: h.configuration?.configuration_id ?? "—",
      version: h.configuration?.configuration_version ?? 0,
      status: h.status,
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
    return { heats, attempts };
  });
}

export async function clearAdminData(): Promise<void> {
  return updateStore((store) => {
    store.heats = {};
    store.attempts = {};
    store.codes = {};
    store.globalCompleted = [];
  });
}

export async function toggleHeatStatus(heatId: string): Promise<string> {
  return updateStore((store) => {
    const heat = store.heats[heatId];
    if (!heat) {
      throw new ApiError("HEAT_NOT_FOUND", "Heat not found");
    }
    heat.status = heat.status === "open" ? "closed" : "open";
    return heat.status;
  });
}

export async function deleteHeat(heatId: string): Promise<void> {
  return updateStore((store) => {
    const heat = store.heats[heatId];
    if (!heat) {
      throw new ApiError("HEAT_NOT_FOUND", "Heat not found");
    }
    for (const attId of heat.attempt_ids) {
      delete store.attempts[attId];
      const index = store.globalCompleted.indexOf(attId);
      if (index > -1) {
        store.globalCompleted.splice(index, 1);
      }
    }
    const codeKey = codeIndexKey(heat.access_code);
    delete store.codes[codeKey];
    delete store.heats[heatId];
  });
}

