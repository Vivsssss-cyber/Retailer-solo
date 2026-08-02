import type { OpeningRoundView, RoundInput, RoundRecord } from "./types";
import { advancePipeline, normalizePipeline, peekScheduledOrder } from "./pipeline";

/**
 * Pure PRD §6 round calculation.
 * Backlog is fulfilled before current-round customer demand.
 * Incoming delivery never exceeds scheduled order (supply rate ≤ 1).
 */
export function calculateRound(input: RoundInput): RoundRecord {
  const scheduledOrder = Math.max(0, Math.floor(input.scheduledOrder));
  const supplyRate = Math.min(1, Math.max(0, input.supplyRate));
  const incomingDelivery = Math.floor(scheduledOrder * supplyRate);

  const openingInventory = Math.max(0, Math.floor(input.openingInventory));
  const openingBacklog = Math.max(0, Math.floor(input.openingBacklog));
  const customerDemand = Math.max(0, Math.floor(input.customerDemand));

  const availableUnits = openingInventory + incomingDelivery;
  const totalRequirement = openingBacklog + customerDemand;

  const fulfilledBacklog = Math.min(openingBacklog, availableUnits);
  const inventoryAfterBacklog = availableUnits - fulfilledBacklog;
  const fulfilledCurrentDemand = Math.min(customerDemand, inventoryAfterBacklog);

  const endingInventory = Math.max(availableUnits - totalRequirement, 0);
  const endingBacklog = Math.max(totalRequirement - availableUnits, 0);

  const inventoryCost = endingInventory * input.inventoryCostPerUnit;
  const backlogCost = endingBacklog * input.backlogCostPerUnit;
  const roundCost = inventoryCost + backlogCost;
  const cumulativeCost = input.previousCumulativeCost + roundCost;

  return {
    round: input.round,
    opening_inventory: openingInventory,
    opening_backlog: openingBacklog,
    scheduled_order: scheduledOrder,
    supply_rate: supplyRate,
    incoming_delivery: incomingDelivery,
    customer_demand: customerDemand,
    fulfilled_backlog: fulfilledBacklog,
    fulfilled_current_demand: fulfilledCurrentDemand,
    ending_inventory: endingInventory,
    ending_backlog: endingBacklog,
    placed_order: Math.max(0, Math.floor(input.placedOrder)),
    inventory_cost: inventoryCost,
    backlog_cost: backlogCost,
    round_cost: roundCost,
    cumulative_cost: cumulativeCost,
    completed_at: new Date().toISOString(),
  };
}

/** Pre-decision view for the current round (delivery already known from pipeline). */
export function buildOpeningView(args: {
  round: number;
  inventory: number;
  backlog: number;
  pipeline: number[];
  deliveryDelay: number;
  supplyRate: number;
  customerDemand: number;
  previousCumulativeCost: number;
}): OpeningRoundView {
  const pipeline = normalizePipeline(args.pipeline, args.deliveryDelay);
  const scheduledOrder = peekScheduledOrder(pipeline);
  const supplyRate = Math.min(1, Math.max(0, args.supplyRate));
  const incomingDelivery = Math.floor(scheduledOrder * supplyRate);
  const openingInventory = Math.max(0, args.inventory);
  const openingBacklog = Math.max(0, args.backlog);
  const availableUnits = openingInventory + incomingDelivery;
  // After this delivery is taken, remaining pipeline (before new order) for UI "next / in two"
  const afterDelivery = pipeline.slice(1);

  return {
    round: args.round,
    openingInventory,
    openingBacklog,
    scheduledOrder,
    supplyRate,
    incomingDelivery,
    customerDemand: Math.max(0, args.customerDemand),
    availableUnits,
    pipelineAfterDelivery: afterDelivery,
    previousCumulativeCost: args.previousCumulativeCost,
  };
}

export function applyRoundToPipeline(
  pipeline: number[],
  deliveryDelay: number,
  placedOrder: number,
): number[] {
  return advancePipeline(pipeline, deliveryDelay, placedOrder);
}
