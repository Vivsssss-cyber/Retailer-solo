import { describe, expect, it } from "vitest";
import { calculateRound } from "../calculateRound";
import { calculateReport } from "../calculateReport";
import { advancePipeline, normalizePipeline } from "../pipeline";
import { DEFAULT_CONFIG } from "../defaultConfig";
import type { RoundRecord } from "../types";

/**
 * Full 12-round simulation: validates PRD end-of-game rule that orders
 * scheduled after the last round never arrive / never affect cost.
 */
describe("full game simulation", () => {
  it("runs 12 rounds; final-round pipeline orders do not create extra rounds", () => {
    const config = DEFAULT_CONFIG;
    let inventory = config.starting_inventory;
    let backlog = config.starting_backlog;
    let pipeline = normalizePipeline(
      config.starting_pipeline_orders,
      config.delivery_delay,
    );
    let cumulative = 0;
    const rounds: RoundRecord[] = [];

    for (let t = 1; t <= config.total_rounds; t++) {
      const scheduled = pipeline[0] ?? 0;
      const supplyRate = config.supply_rate_by_round[t - 1] ?? 1;
      const demand = config.customer_demand_by_round[t - 1] ?? 0;
      // always order demand (stable policy)
      const order = demand;

      const record = calculateRound({
        round: t,
        openingInventory: inventory,
        openingBacklog: backlog,
        scheduledOrder: scheduled,
        supplyRate,
        customerDemand: demand,
        inventoryCostPerUnit: config.inventory_cost_per_unit,
        backlogCostPerUnit: config.backlog_cost_per_unit,
        previousCumulativeCost: cumulative,
        placedOrder: order,
      });

      rounds.push(record);
      inventory = record.ending_inventory;
      backlog = record.ending_backlog;
      cumulative = record.cumulative_cost;
      pipeline = advancePipeline(pipeline, config.delivery_delay, order);
    }

    expect(rounds).toHaveLength(12);
    // After round 12, pipeline still has delay slots but they are never processed
    expect(pipeline.length).toBe(config.delivery_delay);
    expect(pipeline.every((n) => n >= 0)).toBe(true);

    // Round 11–12 orders sit in pipeline; no 13th cost tick
    const report = calculateReport(rounds);
    expect(report.final_cumulative_cost).toBe(rounds[11].cumulative_cost);
    expect(report.total_customer_demand).toBe(
      config.customer_demand_by_round.reduce((a, b) => a + b, 0),
    );

    // Supply shortfall example: if any supply_rate < 1, delivery ≤ scheduled
    for (const r of rounds) {
      expect(r.incoming_delivery).toBeLessThanOrEqual(r.scheduled_order);
      expect(r.supply_rate).toBeLessThanOrEqual(1);
      expect(r.supply_rate).toBeGreaterThanOrEqual(0);
    }
  });

  it("never delivers more than ordered even if rate > 1 is passed", () => {
    const r = calculateRound({
      round: 1,
      openingInventory: 0,
      openingBacklog: 0,
      scheduledOrder: 40,
      supplyRate: 2,
      customerDemand: 0,
      inventoryCostPerUnit: 5,
      backlogCostPerUnit: 10,
      previousCumulativeCost: 0,
      placedOrder: 0,
    });
    expect(r.incoming_delivery).toBe(40);
  });
});
