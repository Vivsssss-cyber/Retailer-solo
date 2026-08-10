/**
 * Admin-managed game configuration (localStorage).
 * New heats/attempts use this snapshot; engine tests still use DEFAULT_CONFIG.
 */

import { DEFAULT_CONFIG, migrateGameConfig, type GameConfig } from "@/engine";

export const ADMIN_CONFIG_KEY = "retailer-challenge-admin-config-v1";
export const ADMIN_SESSION_KEY = "retailer-challenge-admin-session";

export function cloneDefaultConfig(): GameConfig {
  return structuredClone(DEFAULT_CONFIG);
}

export function loadAdminConfig(): GameConfig {
  if (typeof window === "undefined") return cloneDefaultConfig();
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_KEY);
    if (!raw) return cloneDefaultConfig();
    const parsed = JSON.parse(raw) as Partial<GameConfig>;
    const next = migrateGameConfig(
      normalizeGameConfig({ ...cloneDefaultConfig(), ...parsed }),
    );
    // Persist migration so max order sticks after legacy 100 → 10000 bump
    if (parsed.maximum_order === 100 && next.maximum_order !== 100) {
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    return cloneDefaultConfig();
  }
}

export function saveAdminConfig(config: GameConfig): GameConfig {
  const next = normalizeGameConfig(config);
  // Bump version when saving from admin so fingerprints change
  next.configuration_version = Math.max(1, (next.configuration_version || 1) + 0);
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetAdminConfig(): GameConfig {
  const next = cloneDefaultConfig();
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(next));
  }
  return next;
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

/** Mark UI unlocked after successful mock unlock or live admin login. */
export function markAdminUnlocked(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  }
}

/**
 * Mock-only local unlock (no secret in the client bundle).
 * Live mode must call api.adminLogin(pin) then markAdminUnlocked().
 */
export function unlockAdminMock(pin: string): boolean {
  if (!pin.trim()) return false;
  markAdminUnlocked();
  return true;
}

export function lockAdmin() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

/**
 * Align sequence lengths with total_rounds / delivery_delay and clamp values.
 */
export function normalizeGameConfig(input: GameConfig): GameConfig {
  const cfg = migrateGameConfig(input);
  const total = Math.min(50, Math.max(1, Math.floor(cfg.total_rounds) || 12));
  const delay = Math.min(5, Math.max(1, Math.floor(cfg.delivery_delay) || 2));

  const demand = padNumArray(
    cfg.customer_demand_by_round,
    total,
    4,
    (v) => Math.max(0, Math.floor(v)),
  );
  const supply = padNumArray(
    cfg.supply_rate_by_round,
    total,
    1,
    (v) => Math.min(1, Math.max(0, Number(v) || 0)),
  );
  const pipeline = padNumArray(
    cfg.starting_pipeline_orders,
    delay,
    4,
    (v) => Math.max(0, Math.floor(v)),
  );

  const panels = (cfg.info_panels ?? [])
    .filter((p) => p && p.text?.trim())
    .map((p) => ({
      round: Math.min(total, Math.max(1, Math.floor(p.round) || 1)),
      text: String(p.text).trim(),
    }))
    .sort((a, b) => a.round - b.round);

  return {
    ...cfg,
    configuration_id: cfg.configuration_id?.trim() || DEFAULT_CONFIG.configuration_id,
    configuration_version: Math.max(1, Math.floor(cfg.configuration_version) || 1),
    demand_sequence_id: cfg.demand_sequence_id?.trim() || DEFAULT_CONFIG.demand_sequence_id,
    supply_sequence_id: cfg.supply_sequence_id?.trim() || DEFAULT_CONFIG.supply_sequence_id,
    game_name: cfg.game_name?.trim() || DEFAULT_CONFIG.game_name,
    intro_text: cfg.intro_text ?? "",
    timeline_unit: cfg.timeline_unit?.trim() || "Round",
    total_rounds: total,
    delivery_delay: delay,
    starting_inventory: Math.max(0, Math.floor(cfg.starting_inventory) || 0),
    starting_backlog: Math.max(0, Math.floor(cfg.starting_backlog) || 0),
    starting_pipeline_orders: pipeline,
    customer_demand_by_round: demand,
    supply_rate_by_round: supply,
    inventory_cost_per_unit: Math.max(0, Number(cfg.inventory_cost_per_unit) || 0),
    backlog_cost_per_unit: Math.max(0, Number(cfg.backlog_cost_per_unit) || 0),
    minimum_order: Math.max(0, Math.floor(cfg.minimum_order) || 0),
    maximum_order: Math.max(
      Math.floor(cfg.minimum_order) || 0,
      Math.floor(cfg.maximum_order) || 10000,
    ),
    maximum_players_per_heat: Math.min(
      20,
      Math.max(1, Math.floor(cfg.maximum_players_per_heat) || 4),
    ),
    leaderboard_enabled: !!cfg.leaderboard_enabled,
    global_leaderboard_enabled: !!cfg.global_leaderboard_enabled,
    animation_enabled: !!cfg.animation_enabled,
    solo_practice_enabled: cfg.solo_practice_enabled === true,
    info_panels: panels,
    partner_logo: cfg.partner_logo,
  };
}

function padNumArray(
  arr: number[] | undefined,
  len: number,
  fill: number,
  map: (v: number) => number,
): number[] {
  const base = Array.isArray(arr) ? arr.map(map) : [];
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    out.push(i < base.length ? map(base[i]) : fill);
  }
  return out;
}

export function exportConfigJson(config: GameConfig): string {
  return JSON.stringify(normalizeGameConfig(config), null, 2);
}

export function importConfigJson(raw: string): GameConfig {
  const parsed = JSON.parse(raw) as Partial<GameConfig>;
  return normalizeGameConfig({ ...cloneDefaultConfig(), ...parsed });
}

/** Summary stats for admin dashboard (from mock localStorage store). */
export function readMockStoreStats(): {
  heats: number;
  attempts: number;
  completed: number;
  playing: number;
} {
  if (typeof window === "undefined") {
    return { heats: 0, attempts: 0, completed: 0, playing: 0 };
  }
  try {
    const raw = localStorage.getItem("retailer-challenge-v1");
    if (!raw) return { heats: 0, attempts: 0, completed: 0, playing: 0 };
    const store = JSON.parse(raw) as {
      heats?: Record<string, unknown>;
      attempts?: Record<string, { status?: string }>;
    };
    const attempts = Object.values(store.attempts ?? {});
    return {
      heats: Object.keys(store.heats ?? {}).length,
      attempts: attempts.length,
      completed: attempts.filter((a) => a.status === "completed").length,
      playing: attempts.filter((a) => a.status === "playing").length,
    };
  } catch {
    return { heats: 0, attempts: 0, completed: 0, playing: 0 };
  }
}

export function clearMockGameData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("retailer-challenge-v1");
}
