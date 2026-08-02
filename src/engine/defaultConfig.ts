import type { GameConfig } from "./types";

/**
 * EU program provisional seed (versioned).
 * Demand steps up mid-game so players feel pipeline lag; supply has mild disruptions.
 * Lock official sequences with PM before event leaderboards go live.
 */
export const DEFAULT_CONFIG: GameConfig = {
  configuration_id: "eu-retailer-challenge-v1",
  configuration_version: 1,
  demand_sequence_id: "eu-demand-v1",
  supply_sequence_id: "eu-supply-v1",
  intro_text:
    "Manage a retailer through a fast-moving supply-chain challenge. Customer demand must be fulfilled from available stock, while replenishment orders take time to arrive. Balance service and cost to outperform the other challengers.",
  game_name: "Beer Game Sprint: The Retailer Challenge",
  timeline_unit: "Round",
  total_rounds: 12,
  delivery_delay: 2,
  starting_inventory: 12,
  starting_backlog: 0,
  starting_pipeline_orders: [4, 4],
  customer_demand_by_round: [4, 4, 4, 4, 8, 8, 8, 8, 8, 8, 8, 8],
  supply_rate_by_round: [1, 1, 0.9, 1, 1, 0.8, 1, 1, 1, 0.9, 1, 1],
  inventory_cost_per_unit: 5,
  backlog_cost_per_unit: 10,
  minimum_order: 0,
  maximum_order: 100,
  maximum_players_per_heat: 4,
  leaderboard_enabled: true,
  global_leaderboard_enabled: true,
  animation_enabled: true,
  info_panels: [
    {
      round: 1,
      text: "Orders take 2 rounds to arrive. Check the pipeline before increasing your order.",
    },
    {
      round: 5,
      text: "Demand is about to step up. Backlog costs more than holding stock — prepare early.",
    },
  ],
};

export function fingerprintFromConfig(config: GameConfig) {
  return {
    configuration_id: config.configuration_id,
    configuration_version: config.configuration_version,
    demand_sequence_id: config.demand_sequence_id,
    supply_sequence_id: config.supply_sequence_id,
    total_rounds: config.total_rounds,
    delivery_delay: config.delivery_delay,
    inventory_cost: config.inventory_cost_per_unit,
    backlog_cost: config.backlog_cost_per_unit,
  };
}
