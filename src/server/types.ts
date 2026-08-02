import type { Attempt, GameConfig } from "@/engine/types";

export interface HeatRecord {
  heat_id: string;
  access_code: string;
  event_id: string | null;
  configuration_id: string;
  configuration_version: number;
  /** Immutable snapshot for all attempts in this heat. */
  configuration: GameConfig;
  max_players: number;
  attempt_ids: string[];
  status: "open" | "closed";
  created_at: string;
  solo: boolean;
}

/** Server attempt adds optional identity / official flags. */
export interface ServerAttempt extends Attempt {
  event_id: string | null;
  is_official: boolean;
  /** Email / device / auth subject for one-official-attempt lock. */
  player_identity: string | null;
}

export interface DataStore {
  configurations: Record<string, GameConfig>;
  /** event_id → configuration_id */
  events: Record<string, { event_id: string; name: string; configuration_id: string }>;
  heats: Record<string, HeatRecord>;
  /** uppercase access_code → heat_id */
  codes: Record<string, string>;
  attempts: Record<string, ServerAttempt>;
  /** completed attempt ids for global board queries */
  globalCompleted: string[];
}

export function emptyStore(): DataStore {
  return {
    configurations: {},
    events: {},
    heats: {},
    codes: {},
    attempts: {},
    globalCompleted: [],
  };
}
