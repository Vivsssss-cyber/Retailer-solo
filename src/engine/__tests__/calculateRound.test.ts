import { describe, expect, it } from "vitest";
import { calculateRound } from "../calculateRound";
import {
  advancePipeline,
  buildPipelineDisplay,
  normalizePipeline,
} from "../pipeline";
import { calculateReport } from "../calculateReport";
import type { RoundRecord } from "../types";

describe("calculateRound", () => {
  it("applies partial supply: 100 ordered × 0.8 = 80 delivered", () => {
    const r = calculateRound({
      round: 1,
      openingInventory: 0,
      openingBacklog: 0,
      scheduledOrder: 100,
      supplyRate: 0.8,
      customerDemand: 0,
      inventoryCostPerUnit: 5,
      backlogCostPerUnit: 10,
      previousCumulativeCost: 0,
      placedOrder: 10,
    });
    expect(r.incoming_delivery).toBe(80);
    expect(r.ending_inventory).toBe(80);
    expect(r.inventory_cost).toBe(400);
  });

  it("fulfills backlog before current demand", () => {
    const r = calculateRound({
      round: 3,
      openingInventory: 5,
      openingBacklog: 8,
      scheduledOrder: 0,
      supplyRate: 1,
      customerDemand: 10,
      inventoryCostPerUnit: 5,
      backlogCostPerUnit: 10,
      previousCumulativeCost: 50,
      placedOrder: 12,
    });
    // available = 5, total requirement = 18 → all 5 go to backlog first
    expect(r.fulfilled_backlog).toBe(5);
    expect(r.fulfilled_current_demand).toBe(0);
    expect(r.ending_inventory).toBe(0);
    expect(r.ending_backlog).toBe(13);
    expect(r.round_cost).toBe(130);
    expect(r.cumulative_cost).toBe(180);
  });

  it("never delivers more than scheduled order", () => {
    const r = calculateRound({
      round: 1,
      openingInventory: 0,
      openingBacklog: 0,
      scheduledOrder: 50,
      supplyRate: 1.5, // clamped to 1
      customerDemand: 0,
      inventoryCostPerUnit: 5,
      backlogCostPerUnit: 10,
      previousCumulativeCost: 0,
      placedOrder: 0,
    });
    expect(r.incoming_delivery).toBe(50);
  });

  it("floor supply rate calculation", () => {
    const r = calculateRound({
      round: 1,
      openingInventory: 0,
      openingBacklog: 0,
      scheduledOrder: 99,
      supplyRate: 0.9,
      customerDemand: 0,
      inventoryCostPerUnit: 5,
      backlogCostPerUnit: 10,
      previousCumulativeCost: 0,
      placedOrder: 0,
    });
    expect(r.incoming_delivery).toBe(89);
  });
});

describe("pipeline", () => {
  it("advances delay window and appends new order", () => {
    const p0 = normalizePipeline([4, 4], 2);
    const p1 = advancePipeline(p0, 2, 10);
    expect(p1).toEqual([4, 10]);
    const p2 = advancePipeline(p1, 2, 20);
    expect(p2).toEqual([10, 20]);
  });

  it("buildPipelineDisplay: delay 2 shows now, next, and pending order @ +2", () => {
    const slots = buildPipelineDisplay({
      pipeline: [4, 8],
      deliveryDelay: 2,
      supplyRate: 1,
      pendingOrder: 12,
    });
    expect(slots.map((s) => [s.kind, s.eta, s.amount])).toEqual([
      ["arriving", 0, 4],
      ["in_transit", 1, 8],
      ["pending_order", 2, 12],
    ]);
  });

  it("buildPipelineDisplay: supply rate floors arriving amount", () => {
    const slots = buildPipelineDisplay({
      pipeline: [100, 4],
      deliveryDelay: 2,
      supplyRate: 0.8,
      pendingOrder: 0,
    });
    expect(slots[0].amount).toBe(80);
    expect(slots[0].scheduled).toBe(100);
    expect(slots[2].amount).toBe(0);
  });

  it("order placed this round arrives after full delay", () => {
    // Place 15 in round 1 with delay 2 → arrives when round 3 processes
    let pipeline = normalizePipeline([4, 4], 2);
    pipeline = advancePipeline(pipeline, 2, 15); // after R1: [4, 15]
    pipeline = advancePipeline(pipeline, 2, 0); // after R2: [15, 0]
    expect(pipeline[0]).toBe(15);
  });
});

describe("calculateReport", () => {
  it("computes fill rate and cost split", () => {
    const rounds: RoundRecord[] = [
      {
        round: 1,
        opening_inventory: 12,
        opening_backlog: 0,
        scheduled_order: 4,
        supply_rate: 1,
        incoming_delivery: 4,
        customer_demand: 4,
        fulfilled_backlog: 0,
        fulfilled_current_demand: 4,
        ending_inventory: 12,
        ending_backlog: 0,
        placed_order: 4,
        inventory_cost: 60,
        backlog_cost: 0,
        round_cost: 60,
        cumulative_cost: 60,
        completed_at: new Date().toISOString(),
      },
      {
        round: 2,
        opening_inventory: 12,
        opening_backlog: 0,
        scheduled_order: 4,
        supply_rate: 1,
        incoming_delivery: 4,
        customer_demand: 10,
        fulfilled_backlog: 0,
        fulfilled_current_demand: 10,
        ending_inventory: 6,
        ending_backlog: 0,
        placed_order: 12,
        inventory_cost: 30,
        backlog_cost: 0,
        round_cost: 30,
        cumulative_cost: 90,
        completed_at: new Date().toISOString(),
      },
    ];
    const report = calculateReport(rounds);
    expect(report.final_cumulative_cost).toBe(90);
    expect(report.immediate_demand_fill_rate).toBe(1);
    expect(report.total_inventory_cost).toBe(90);
    expect(report.average_order).toBe(8);
  });
});
