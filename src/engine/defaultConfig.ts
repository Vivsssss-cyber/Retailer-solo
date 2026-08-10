import type { GameConfig } from "./types";

/**
 * EU program provisional seed (versioned).
 * Demand steps up mid-game so players feel pipeline lag; supply has mild disruptions.
 * Lock official sequences with PM before event leaderboards go live.
 */
/** Previous product default; v1 snapshots with this value are upgraded. */
const LEGACY_MAXIMUM_ORDER = 100;

export const DEFAULT_CONFIG: GameConfig = {
  configuration_id: "eu-retailer-challenge-v1",
  configuration_version: 2,
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
  maximum_order: 10000,
  maximum_players_per_heat: 4,
  leaderboard_enabled: true,
  global_leaderboard_enabled: true,
  animation_enabled: true,
  /** Players join admin-created heats by default; practice is opt-in. */
  solo_practice_enabled: false,
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

/**
 * Raise legacy max order (100 → 10000) on v1 configs snapshotted before the product default change.
 * Intentional max of 100 after version ≥ 2 is left alone.
 */
export function migrateGameConfig(config: GameConfig): GameConfig {
  const version = config.configuration_version ?? 1;
  let next: GameConfig = {
    ...config,
    // Older snapshots omit the flag — keep classroom default (join-only).
    solo_practice_enabled: config.solo_practice_enabled === true,
  };
  if (version <= 1 && config.maximum_order === LEGACY_MAXIMUM_ORDER) {
    next = {
      ...next,
      maximum_order: DEFAULT_CONFIG.maximum_order,
      configuration_version: Math.max(version, DEFAULT_CONFIG.configuration_version),
    };
  }
  return next;
}

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
