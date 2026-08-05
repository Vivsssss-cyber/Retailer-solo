import type {
  Attempt,
  GameConfig,
  LeaderboardRow,
  PerformanceReport,
  RoundRecord,
} from "@/engine/types";

export interface CreateHeatRequest {
  player_name?: string;
  configuration_id?: string;
  solo?: boolean;
}

export interface CreateHeatResponse {
  heat_id: string;
  access_code: string;
  configuration: GameConfig;
}

export interface CreateAttemptRequest {
  player_name: string;
  /** Stable identity for one-official-attempt lock (email / device id). */
  player_identity?: string;
  /** When true, server rejects a second attempt with the same identity. */
  is_official?: boolean;
}

export interface SubmitRoundRequest {
  round: number;
  placed_order: number;
}

export interface SubmitRoundResponse {
  accepted: boolean;
  round_record: RoundRecord;
  attempt: Attempt;
  live_heat_board: LeaderboardRow[];
}

export interface CompleteAttemptResponse {
  attempt: Attempt;
  report: PerformanceReport;
  heat_rank: number | null;
  global_rank: number | null;
  live_heat_board: LeaderboardRow[];
  /** Min final cost among completed attempts in the heat (gap-to-winner UI). */
  heat_winner_cost?: number | null;
}

export interface RetailerChallengeApi {
  getConfiguration(configurationId?: string): Promise<GameConfig>;
  /** Admin write — live API requires X-Admin-Pin; mock writes localStorage. */
  putConfiguration(config: GameConfig): Promise<GameConfig>;
  createHeat(body: CreateHeatRequest): Promise<CreateHeatResponse>;
  createAttempt(heatId: string, body: CreateAttemptRequest): Promise<Attempt>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  submitRound(attemptId: string, body: SubmitRoundRequest): Promise<SubmitRoundResponse>;
  completeAttempt(attemptId: string): Promise<CompleteAttemptResponse>;
  getHeatLeaderboard(heatId: string, mode: "live" | "final"): Promise<LeaderboardRow[]>;
  getGlobalLeaderboard(configurationId: string): Promise<LeaderboardRow[]>;
  getAdminData(): Promise<{
    heats: Array<{
      heat_id: string;
      access_code: string;
      created_at: string;
      players: number;
      config_id: string;
      version: number;
      status: "open" | "closed";
    }>;
    attempts: Array<{
      attempt_id: string;
      player_name: string;
      heat_id: string;
      status: string;
      round: number;
      cost: number;
      started_at: string;
    }>;
    stats: { heats: number; attempts: number; completed: number; playing: number };
  }>;
  clearAdminData(): Promise<void>;
  toggleHeatStatus(heatId: string): Promise<{ status: "open" | "closed" }>;
  deleteHeat(heatId: string): Promise<void>;
}
