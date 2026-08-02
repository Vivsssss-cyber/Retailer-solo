import { calculateReport, fingerprintFromConfig } from "@/engine";
import type { LeaderboardRow } from "@/engine/types";
import type { ServerAttempt } from "./types";

export function toLeaderboardRow(
  attempt: ServerAttempt,
  position: number,
): LeaderboardRow {
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

/** Live: completed_round DESC → cost ASC → earliest time. */
export function sortLive(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .sort((a, b) => {
      if (b.completed_round !== a.completed_round) {
        return b.completed_round - a.completed_round;
      }
      if (a.cumulative_cost !== b.cumulative_cost) {
        return a.cumulative_cost - b.cumulative_cost;
      }
      const ta = a.completed_at ? Date.parse(a.completed_at) : Number.MAX_SAFE_INTEGER;
      const tb = b.completed_at ? Date.parse(b.completed_at) : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    })
    .map((r, i) => ({ ...r, position: i + 1 }));
}

/**
 * Final / global: cost ASC → backlog unit-weeks ASC →
 * order volatility ASC → earliest completion.
 */
export function sortFinal(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .filter((r) => r.status === "completed")
    .sort((a, b) => {
      if (a.cumulative_cost !== b.cumulative_cost) {
        return a.cumulative_cost - b.cumulative_cost;
      }
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

export function heatBoard(
  attempts: ServerAttempt[],
  mode: "live" | "final",
): LeaderboardRow[] {
  const rows = attempts.map((a, i) => toLeaderboardRow(a, i + 1));
  return mode === "final" ? sortFinal(rows) : sortLive(rows);
}

export function rankForAttempt(
  board: LeaderboardRow[],
  attempt: ServerAttempt,
): number | null {
  const row = board.find(
    (r) =>
      r.player_name === attempt.player_name &&
      r.cumulative_cost === attempt.cumulative_cost &&
      r.completed_at === attempt.completed_at &&
      r.completed_round === attempt.rounds.length,
  );
  return row?.position ?? null;
}
