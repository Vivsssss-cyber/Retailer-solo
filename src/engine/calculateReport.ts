import type { PerformanceReport, RoundRecord } from "./types";

function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function variance(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

/**
 * Objective final performance metrics + rule-based insight (PRD §7).
 * No personality tiers.
 */
export function calculateReport(rounds: RoundRecord[]): PerformanceReport {
  if (rounds.length === 0) {
    return {
      final_cumulative_cost: 0,
      total_inventory_cost: 0,
      total_backlog_cost: 0,
      immediate_demand_fill_rate: 1,
      backlog_unit_weeks: 0,
      average_inventory: 0,
      peak_inventory: 0,
      peak_backlog: 0,
      rounds_with_backlog: 0,
      average_order: 0,
      order_volatility: 0,
      bullwhip_ratio: null,
      total_customer_demand: 0,
      total_fulfilled_current_demand: 0,
      primary_insight: "No rounds completed.",
      improvement_direction: "Complete an attempt to see guidance.",
    };
  }

  const totalInventoryCost = rounds.reduce((s, r) => s + r.inventory_cost, 0);
  const totalBacklogCost = rounds.reduce((s, r) => s + r.backlog_cost, 0);
  const finalCost = rounds[rounds.length - 1].cumulative_cost;
  const totalDemand = rounds.reduce((s, r) => s + r.customer_demand, 0);
  const totalFulfilledCurrent = rounds.reduce((s, r) => s + r.fulfilled_current_demand, 0);
  const fillRate = totalDemand > 0 ? totalFulfilledCurrent / totalDemand : 1;
  const backlogUnitWeeks = rounds.reduce((s, r) => s + r.ending_backlog, 0);
  const averageInventory =
    rounds.reduce((s, r) => s + r.ending_inventory, 0) / rounds.length;
  const peakInventory = Math.max(...rounds.map((r) => r.ending_inventory));
  const peakBacklog = Math.max(...rounds.map((r) => r.ending_backlog));
  const roundsWithBacklog = rounds.filter((r) => r.ending_backlog > 0).length;
  const orders = rounds.map((r) => r.placed_order);
  const demands = rounds.map((r) => r.customer_demand);
  const averageOrder = orders.reduce((a, b) => a + b, 0) / orders.length;
  const orderVolatility = stdev(orders);
  const demandVar = variance(demands);
  const orderVar = variance(orders);
  const bullwhipRatio = demandVar > 0 ? orderVar / demandVar : null;

  const backlogShare = finalCost > 0 ? totalBacklogCost / finalCost : 0;
  const inventoryShare = finalCost > 0 ? totalInventoryCost / finalCost : 0;

  let primary_insight: string;
  let improvement_direction: string;

  if (bullwhipRatio !== null && bullwhipRatio > 2) {
    primary_insight = `Your orders varied ${bullwhipRatio.toFixed(1)} times more than customer demand. Large corrections increased the movement between shortage and excess inventory.`;
    improvement_direction =
      "Reduce repeated ordering while significant supply is already in the pipeline.";
  } else if (backlogShare >= 0.55) {
    primary_insight = `Most of your total cost came from unfulfilled demand. Backlog represented ${Math.round(backlogShare * 100)}% of your final cost, and ${Math.round(fillRate * 100)}% of customer demand was fulfilled immediately.`;
    improvement_direction =
      "React earlier to sustained backlog rather than making one large correction.";
  } else if (inventoryShare >= 0.55) {
    primary_insight = `Most of your cost came from excess stock. Inventory represented ${Math.round(inventoryShare * 100)}% of your final cost, with an average of ${averageInventory.toFixed(0)} units remaining after each round.`;
    improvement_direction =
      "Consider orders already in transit before increasing the next order.";
  } else {
    primary_insight = `You maintained a ${Math.round(fillRate * 100)}% immediate fill rate while keeping both inventory and order variation relatively controlled.`;
    improvement_direction =
      "Consider orders already in transit before increasing the next order.";
  }

  return {
    final_cumulative_cost: finalCost,
    total_inventory_cost: totalInventoryCost,
    total_backlog_cost: totalBacklogCost,
    immediate_demand_fill_rate: fillRate,
    backlog_unit_weeks: backlogUnitWeeks,
    average_inventory: averageInventory,
    peak_inventory: peakInventory,
    peak_backlog: peakBacklog,
    rounds_with_backlog: roundsWithBacklog,
    average_order: averageOrder,
    order_volatility: orderVolatility,
    bullwhip_ratio: bullwhipRatio,
    total_customer_demand: totalDemand,
    total_fulfilled_current_demand: totalFulfilledCurrent,
    primary_insight,
    improvement_direction,
  };
}
