/** Game configuration — shared client/server contract (PRD §8). */
export interface GameConfig {
  configuration_id: string;
  configuration_version: number;
  demand_sequence_id: string;
  supply_sequence_id: string;
  partner_logo?: string;
  intro_text: string;
  game_name: string;
  /** Display label for a period, e.g. "Round" or "Week". */
  timeline_unit: string;
  total_rounds: number;
  delivery_delay: number;
  starting_inventory: number;
  starting_backlog: number;
  /** Length should equal delivery_delay; index 0 arrives next processed round. */
  starting_pipeline_orders: number[];
  customer_demand_by_round: number[];
  supply_rate_by_round: number[];
  inventory_cost_per_unit: number;
  backlog_cost_per_unit: number;
  minimum_order: number;
  maximum_order: number;
  maximum_players_per_heat: number;
  leaderboard_enabled: boolean;
  global_leaderboard_enabled: boolean;
  animation_enabled: boolean;
  /** Optional coaching text shown at the start of a given round (1-based). */
  info_panels?: { round: number; text: string }[];
}

/** Full round record — PRD §8 persistence shape. */
export interface RoundRecord {
  round: number;
  opening_inventory: number;
  opening_backlog: number;
  scheduled_order: number;
  supply_rate: number;
  incoming_delivery: number;
  customer_demand: number;
  fulfilled_backlog: number;
  fulfilled_current_demand: number;
  ending_inventory: number;
  ending_backlog: number;
  placed_order: number;
  inventory_cost: number;
  backlog_cost: number;
  round_cost: number;
  cumulative_cost: number;
  completed_at: string;
}

export interface RoundInput {
  openingInventory: number;
  openingBacklog: number;
  /** Order that was scheduled to arrive this round (from pipeline). */
  scheduledOrder: number;
  supplyRate: number;
  customerDemand: number;
  inventoryCostPerUnit: number;
  backlogCostPerUnit: number;
  previousCumulativeCost: number;
  placedOrder: number;
  round: number;
}

/** Opening state shown before the player confirms an order this round. */
export interface OpeningRoundView {
  round: number;
  openingInventory: number;
  openingBacklog: number;
  scheduledOrder: number;
  supplyRate: number;
  incomingDelivery: number;
  customerDemand: number;
  availableUnits: number;
  /** Pipeline slots after delivery is taken: [arriving next, in 2 rounds, ...] */
  pipelineAfterDelivery: number[];
  previousCumulativeCost: number;
}

export interface PerformanceReport {
  final_cumulative_cost: number;
  total_inventory_cost: number;
  total_backlog_cost: number;
  immediate_demand_fill_rate: number;
  backlog_unit_weeks: number;
  average_inventory: number;
  peak_inventory: number;
  peak_backlog: number;
  rounds_with_backlog: number;
  average_order: number;
  order_volatility: number;
  bullwhip_ratio: number | null;
  total_customer_demand: number;
  total_fulfilled_current_demand: number;
  primary_insight: string;
  improvement_direction: string;
}

export type AttemptStatus = "playing" | "completed";

export interface Attempt {
  attempt_id: string;
  heat_id: string;
  player_name: string;
  configuration: GameConfig;
  status: AttemptStatus;
  current_round: number;
  /** Orders still in transit; index 0 arrives on next processRound. */
  pipeline: number[];
  inventory: number;
  backlog: number;
  cumulative_cost: number;
  rounds: RoundRecord[];
  started_at: string;
  completed_at?: string;
}

export interface LeaderboardRow {
  position: number;
  player_name: string;
  completed_round: number;
  cumulative_cost: number;
  status: AttemptStatus;
  completed_at?: string;
  configuration_id: string;
  configuration_version: number;
  demand_sequence_id: string;
  supply_sequence_id: string;
  total_rounds: number;
  delivery_delay: number;
  inventory_cost: number;
  backlog_cost: number;
  immediate_fill_rate?: number;
  backlog_unit_weeks?: number;
  order_volatility?: number;
}

export interface ConfigFingerprint {
  configuration_id: string;
  configuration_version: number;
  demand_sequence_id: string;
  supply_sequence_id: string;
  total_rounds: number;
  delivery_delay: number;
  inventory_cost: number;
  backlog_cost: number;
}

/** animating = post-submit screen (vehicle rail + round summary merged). */
export type UiPhase = "intro" | "decide" | "animating" | "report";
