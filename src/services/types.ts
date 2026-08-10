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

/** Public heat/room summary for join page + admin detail. */
export interface HeatSummary {
  heat_id: string;
  access_code: string;
  configuration: GameConfig;
  attempt_count: number;
  max_players: number;
  status: "open" | "closed";
}

/** Admin-only multiplayer room create (cookie session or X-Admin-Pin in live mode). */
export interface AdminCreateRoomRequest {
  player_name?: string;
  configuration_id?: string;
}

export interface CreateAttemptRequest {
  player_name: string;
  /**
   * Soft identity for official one-attempt lock (email / local id).
   * Classroom room access is heat access_code + QR — not email OTP.
   */
  player_identity?: string;
  /** When true, server requires identity and rejects a second attempt with same identity. */
  is_official?: boolean;
}

export interface CreateAttemptResponse {
  attempt: import("@/engine/types").Attempt;
  /** Ownership secret — store client-side; send as X-Player-Token. */
  player_token: string;
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
  /** Admin write — live API requires admin cookie session; mock writes localStorage. */
  putConfiguration(config: GameConfig): Promise<GameConfig>;
  /** Public: solo practice only from player UI. Multiplayer create uses adminCreateRoom. */
  createHeat(body: CreateHeatRequest): Promise<CreateHeatResponse>;
  /** Admin-only multiplayer room (session cookie after adminLogin). */
  adminCreateRoom(body?: AdminCreateRoomRequest): Promise<CreateHeatResponse>;
  /** Resolve heat by id or access code. */
  getHeat(heatIdOrCode: string): Promise<HeatSummary>;
  createAttempt(
    heatId: string,
    body: CreateAttemptRequest,
  ): Promise<CreateAttemptResponse>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  submitRound(attemptId: string, body: SubmitRoundRequest): Promise<SubmitRoundResponse>;
  completeAttempt(attemptId: string): Promise<CompleteAttemptResponse>;
  getHeatLeaderboard(heatId: string, mode: "live" | "final"): Promise<LeaderboardRow[]>;
  getGlobalLeaderboard(configurationId: string): Promise<LeaderboardRow[]>;
  /** Live: server verifies PIN, sets httpOnly cookie. Mock: no-op. */
  adminLogin(pin: string): Promise<{ ok: true }>;
  adminLogout(): Promise<{ ok: true }>;
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
