import type { GameConfig } from "./types";

/** Normalize pipeline to delivery_delay length (pad with 0). */
export function normalizePipeline(orders: number[], deliveryDelay: number): number[] {
  const out = orders.slice(0, deliveryDelay).map((n) => Math.max(0, Math.floor(n)));
  while (out.length < deliveryDelay) out.push(0);
  return out;
}

/**
 * Peek delivery for the current round without mutating.
 * index 0 of pipeline arrives now.
 */
export function peekScheduledOrder(pipeline: number[]): number {
  return pipeline.length > 0 ? pipeline[0] : 0;
}

/**
 * After processing a round: drop arrived slot, shift remaining, append new order.
 * Orders that would arrive after game end still sit in pipeline but never process.
 */
export function advancePipeline(
  pipeline: number[],
  deliveryDelay: number,
  newOrder: number,
): number[] {
  const rest = pipeline.slice(1);
  const next = [...rest, Math.max(0, Math.floor(newOrder))];
  return normalizePipeline(next, deliveryDelay);
}

/**
 * Legacy 3-slot peek (kept for callers). Prefer `buildPipelineDisplay`.
 * Note: with delay=2, `inTwo` is always 0 — the pending order is not in the array yet.
 */
export function pipelineSlots(
  pipeline: number[],
  deliveryDelay: number,
): { now: number; next: number; inTwo: number } {
  const p = normalizePipeline(pipeline, Math.max(deliveryDelay, 3));
  return {
    now: p[0] ?? 0,
    next: p[1] ?? 0,
    inTwo: p[2] ?? 0,
  };
}

/** One visible cell on the delivery rail. */
export type PipelineDisplaySlot = {
  key: string;
  /** Periods until this quantity arrives: 0 = this period. */
  eta: number;
  /** Units the player should expect (supply-adjusted for eta 0). */
  amount: number;
  /** Scheduled units before supply rate (eta 0 only). */
  scheduled?: number;
  kind: "arriving" | "in_transit" | "pending_order";
};

/**
 * Build pipeline UI slots for the decide screen.
 *
 * - Index 0 of `pipeline` arrives **this** period (supply rate applied).
 * - Remaining indices are pure in-transit amounts.
 * - Optional `pendingOrder` is shown as the last cell (arrives after `deliveryDelay` periods).
 *
 * Delay 2 example: [arriving now, next period, your order @ +2].
 */
export function buildPipelineDisplay(args: {
  pipeline: number[];
  deliveryDelay: number;
  supplyRate?: number;
  pendingOrder?: number | null;
}): PipelineDisplaySlot[] {
  const delay = Math.max(1, Math.floor(args.deliveryDelay) || 1);
  const p = normalizePipeline(args.pipeline, delay);
  const rate = Math.min(1, Math.max(0, args.supplyRate ?? 1));
  const slots: PipelineDisplaySlot[] = [];

  for (let i = 0; i < delay; i++) {
    const scheduled = p[i] ?? 0;
    if (i === 0) {
      const amount = Math.floor(scheduled * rate);
      slots.push({
        key: "arriving",
        eta: 0,
        amount,
        scheduled,
        kind: "arriving",
      });
    } else {
      slots.push({
        key: `transit-${i}`,
        eta: i,
        amount: scheduled,
        kind: "in_transit",
      });
    }
  }

  if (args.pendingOrder != null && Number.isFinite(args.pendingOrder)) {
    slots.push({
      key: "pending",
      eta: delay,
      amount: Math.max(0, Math.floor(args.pendingOrder)),
      kind: "pending_order",
    });
  }

  return slots;
}

export function demandForRound(config: GameConfig, round: number): number {
  const idx = round - 1;
  if (idx < 0 || idx >= config.customer_demand_by_round.length) return 0;
  return config.customer_demand_by_round[idx];
}

export function supplyRateForRound(config: GameConfig, round: number): number {
  const idx = round - 1;
  if (idx < 0 || idx >= config.supply_rate_by_round.length) return 1;
  const rate = config.supply_rate_by_round[idx];
  return Math.min(1, Math.max(0, rate));
}

export function clampOrder(order: number, config: GameConfig): number {
  const n = Math.floor(Number.isFinite(order) ? order : 0);
  return Math.min(config.maximum_order, Math.max(config.minimum_order, n));
}

/** Round when this order is expected to arrive (1-based). */
export function expectedArrivalRound(currentRound: number, deliveryDelay: number): number {
  return currentRound + deliveryDelay;
}
