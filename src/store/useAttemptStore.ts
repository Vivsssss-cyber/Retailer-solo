"use client";

import { create } from "zustand";
import type {
  Attempt,
  LeaderboardRow,
  OpeningRoundView,
  PerformanceReport,
  RoundRecord,
  UiPhase,
} from "@/engine";
import { calculateReport, migrateGameConfig } from "@/engine";
import { isHeatId, normalizeHeatKey } from "@/lib/heatKey";
import { api } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";
import { getOpeningPreview } from "@/services/mockAdapter";

export interface JoinOptions {
  player_identity?: string;
  is_official?: boolean;
}

const HEAT_CODE_KEY = "retailer-challenge-heat-code";

function persistHeatCode(code: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (code) sessionStorage.setItem(HEAT_CODE_KEY, code);
    else sessionStorage.removeItem(HEAT_CODE_KEY);
  } catch {
    /* ignore */
  }
}

function readPersistedHeatCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(HEAT_CODE_KEY);
  } catch {
    return null;
  }
}

interface AttemptState {
  phase: UiPhase;
  attempt: Attempt | null;
  opening: OpeningRoundView | null;
  lastRecord: RoundRecord | null;
  orderInput: number;
  leaderboard: LeaderboardRow[];
  globalBoard: LeaderboardRow[];
  report: PerformanceReport | null;
  heatRank: number | null;
  globalRank: number | null;
  heatWinnerCost: number | null;
  /** Access code for the current heat (host/join) — shown in header for sharing. */
  heatAccessCode: string | null;
  error: string | null;
  submitting: boolean;
  skipAnimation: boolean;

  startSolo: (playerName: string) => Promise<string>;
  /**
   * Create a multiplayer heat and return codes without starting an attempt.
   * Host shows the code, then calls joinHeat(heat_id, name).
   */
  createHostedHeat: (playerName?: string) => Promise<{
    heat_id: string;
    access_code: string;
  }>;
  joinHeat: (
    heatIdOrCode: string,
    playerName: string,
    options?: JoinOptions,
  ) => Promise<string>;
  hydrate: (attemptId: string) => Promise<void>;
  setOrderInput: (n: number) => void;
  confirmOrder: () => Promise<void>;
  /** After merged animation+summary screen → next decide or final report. */
  finishRoundSummary: () => void;
  setSkipAnimation: (v: boolean) => void;
  refreshLeaderboards: () => Promise<void>;
  loadReport: () => Promise<void>;
  /** Start a fresh attempt in the same heat (play again). Returns new attempt id. */
  playAgain: () => Promise<string>;
  reset: () => void;
}

const initial = {
  phase: "intro" as UiPhase,
  attempt: null as Attempt | null,
  opening: null as OpeningRoundView | null,
  lastRecord: null as RoundRecord | null,
  orderInput: 0,
  leaderboard: [] as LeaderboardRow[],
  globalBoard: [] as LeaderboardRow[],
  report: null as PerformanceReport | null,
  heatRank: null as number | null,
  globalRank: null as number | null,
  heatWinnerCost: null as number | null,
  heatAccessCode: null as string | null,
  error: null as string | null,
  submitting: false,
  skipAnimation: false,
};

function withMigratedConfig(attempt: Attempt): Attempt {
  const configuration = migrateGameConfig(attempt.configuration);
  if (configuration.maximum_order === attempt.configuration.maximum_order) {
    return attempt;
  }
  return { ...attempt, configuration };
}

function syncOpening(attempt: Attempt): OpeningRoundView | null {
  if (attempt.status === "completed") return null;
  return getOpeningPreview(attempt);
}

/** Coalesce concurrent startSolo (Strict Mode double-effect, double-click). */
let startSoloInflight: Promise<string> | null = null;

export const useAttemptStore = create<AttemptState>((set, get) => ({
  ...initial,

  async startSolo(playerName: string) {
    if (startSoloInflight) return startSoloInflight;

    startSoloInflight = (async () => {
      set({ error: null, submitting: true });
      try {
        const heat = await api.createHeat({ solo: true, player_name: playerName });
        persistHeatCode(heat.access_code);
        // Prefer access code for attempt create — same path multiplayer join uses
        const attempt = withMigratedConfig(
          await api.createAttempt(heat.access_code || heat.heat_id, {
            player_name: playerName,
          }),
        );
        const opening = syncOpening(attempt);
        set({
          attempt,
          opening,
          phase: "decide",
          orderInput: 0,
          heatAccessCode: heat.access_code,
          submitting: false,
        });
        await get().refreshLeaderboards();
        return attempt.attempt_id;
      } catch (e) {
        const { message } = parseApiFailure(e);
        set({ error: message, submitting: false });
        throw e;
      } finally {
        startSoloInflight = null;
      }
    })();

    return startSoloInflight;
  },

  async createHostedHeat(playerName?: string) {
    set({ error: null, submitting: true });
    try {
      const heat = await api.createHeat({
        solo: false,
        player_name: playerName,
      });
      persistHeatCode(heat.access_code);
      set({
        heatAccessCode: heat.access_code,
        submitting: false,
      });
      return { heat_id: heat.heat_id, access_code: heat.access_code };
    } catch (e) {
      const { message } = parseApiFailure(e);
      set({
        error: message,
        submitting: false,
      });
      throw e;
    }
  },

  async joinHeat(
    heatIdOrCode: string,
    playerName: string,
    options?: JoinOptions,
  ) {
    set({ error: null, submitting: true });
    try {
      const key = normalizeHeatKey(heatIdOrCode);
      if (!key) {
        const err = new Error("Enter a heat code first.");
        set({ error: err.message, submitting: false });
        throw err;
      }
      // If joining by short code (not heat_ id), remember it for the header.
      if (!isHeatId(key)) {
        persistHeatCode(key);
        set({ heatAccessCode: key });
      }
      const isOfficial = options?.is_official === true;
      const identity = options?.player_identity?.trim() || undefined;
      if (isOfficial && !identity) {
        const err = new Error(
          "Official attempts need an email or ID so we can lock one attempt per person.",
        );
        set({ error: err.message, submitting: false });
        throw err;
      }
      const attempt = withMigratedConfig(
        await api.createAttempt(key, {
          player_name: playerName,
          is_official: isOfficial || undefined,
          player_identity: isOfficial ? identity : undefined,
        }),
      );
      const opening = syncOpening(attempt);
      set({
        attempt,
        opening,
        phase: "decide",
        orderInput: 0,
        heatAccessCode: get().heatAccessCode ?? readPersistedHeatCode(),
        submitting: false,
      });
      await get().refreshLeaderboards();
      return attempt.attempt_id;
    } catch (e) {
      const { message } = parseApiFailure(e);
      set({ error: message, submitting: false });
      throw e;
    }
  },

  async hydrate(attemptId: string) {
    set({ error: null, heatAccessCode: readPersistedHeatCode() });
    try {
      const raw = await api.getAttempt(attemptId);
      if (!raw) {
        set({ error: "Attempt not found", phase: "intro" });
        return;
      }
      const attempt = withMigratedConfig(raw);
      if (attempt.status === "completed") {
        const report = calculateReport(attempt.rounds);
        set({
          attempt,
          opening: null,
          phase: "report",
          report,
          lastRecord: attempt.rounds[attempt.rounds.length - 1] ?? null,
          heatAccessCode: readPersistedHeatCode(),
        });
        await get().loadReport();
        return;
      }
      const opening = syncOpening(attempt);
      set({
        attempt,
        opening,
        phase: "decide",
        orderInput: 0,
        heatAccessCode: readPersistedHeatCode(),
      });
      await get().refreshLeaderboards();
    } catch (e) {
      const { message } = parseApiFailure(e);
      set({ error: message });
    }
  },

  setOrderInput(n: number) {
    const cfg = get().attempt?.configuration;
    const migrated = cfg ? migrateGameConfig(cfg) : null;
    const max = migrated?.maximum_order ?? 10000;
    const min = migrated?.minimum_order ?? 0;
    set({ orderInput: Math.min(max, Math.max(min, Math.floor(n) || 0)) });
  },

  async confirmOrder() {
    const { attempt, orderInput } = get();
    if (!attempt || attempt.status === "completed" || get().submitting) return;
    set({ submitting: true, error: null });
    try {
      const res = await api.submitRound(attempt.attempt_id, {
        round: attempt.current_round,
        placed_order: orderInput,
      });
      const next = withMigratedConfig(res.attempt);

      set({
        attempt: next,
        lastRecord: res.round_record,
        leaderboard: res.live_heat_board,
        submitting: false,
        // Single post-submit screen: vehicle rail + summary KPIs together
        phase: "animating",
      });
    } catch (e) {
      const { message } = parseApiFailure(e);
      set({ error: message, submitting: false });
    }
  },

  finishRoundSummary() {
    const { attempt } = get();
    if (!attempt) return;
    if (attempt.status === "completed") {
      const report = calculateReport(attempt.rounds);
      set({ phase: "report", report, opening: null });
      void get().loadReport();
      return;
    }
    const opening = syncOpening(attempt);
    set({
      phase: "decide",
      opening,
      orderInput: 0,
    });
    void get().refreshLeaderboards();
  },

  setSkipAnimation(v: boolean) {
    set({ skipAnimation: v });
  },

  async refreshLeaderboards() {
    const { attempt } = get();
    if (!attempt) return;
    try {
      const [live, global] = await Promise.all([
        api.getHeatLeaderboard(attempt.heat_id, "live"),
        api.getGlobalLeaderboard(attempt.configuration.configuration_id),
      ]);
      set({ leaderboard: live, globalBoard: global });
    } catch {
      /* ignore poll errors */
    }
  },

  async loadReport() {
    const { attempt } = get();
    if (!attempt) return;
    try {
      const res = await api.completeAttempt(attempt.attempt_id);
      const finished = res.live_heat_board.filter((r) => r.status === "completed");
      const winnerCost =
        finished.length > 0
          ? Math.min(...finished.map((r) => r.cumulative_cost))
          : res.report.final_cumulative_cost;
      set({
        report: res.report,
        heatRank: res.heat_rank,
        globalRank: res.global_rank,
        heatWinnerCost: winnerCost,
        leaderboard: res.live_heat_board,
      });
    } catch {
      set({ report: calculateReport(attempt.rounds) });
    }
  },

  async playAgain() {
    const { attempt } = get();
    if (!attempt) throw new Error("No attempt to restart");
    const playerName = attempt.player_name;
    const heatId = attempt.heat_id;
    set({ error: null, submitting: true });
    try {
      const next = withMigratedConfig(
        await api.createAttempt(heatId, { player_name: playerName }),
      );
      const opening = syncOpening(next);
      set({
        attempt: next,
        opening,
        phase: "decide",
        lastRecord: null,
        orderInput: 0,
        report: null,
        heatRank: null,
        globalRank: null,
        heatWinnerCost: null,
        submitting: false,
        error: null,
      });
      await get().refreshLeaderboards();
      return next.attempt_id;
    } catch {
      // Heat may be full — create a new solo heat instead
      try {
        const heat = await api.createHeat({ solo: true, player_name: playerName });
        const next = withMigratedConfig(
          await api.createAttempt(heat.heat_id, {
            player_name: playerName,
          }),
        );
        const opening = syncOpening(next);
        set({
          attempt: next,
          opening,
          phase: "decide",
          lastRecord: null,
          orderInput: 0,
          report: null,
          heatRank: null,
          globalRank: null,
          heatWinnerCost: null,
          submitting: false,
          error: null,
        });
        await get().refreshLeaderboards();
        return next.attempt_id;
      } catch (e2) {
        const { message } = parseApiFailure(e2);
        set({
          error: message,
          submitting: false,
        });
        throw e2;
      }
    }
  },

  reset() {
    // Keep heat code in session for refresh; full clear only drops in-memory UI.
    set({ ...initial, heatAccessCode: readPersistedHeatCode() });
  },
}));
