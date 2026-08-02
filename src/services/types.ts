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
}

export interface RetailerChallengeApi {
  getConfiguration(configurationId?: string): Promise<GameConfig>;
  createHeat(body: CreateHeatRequest): Promise<CreateHeatResponse>;
  createAttempt(heatId: string, body: CreateAttemptRequest): Promise<Attempt>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  submitRound(attemptId: string, body: SubmitRoundRequest): Promise<SubmitRoundResponse>;
  completeAttempt(attemptId: string): Promise<CompleteAttemptResponse>;
  getHeatLeaderboard(heatId: string, mode: "live" | "final"): Promise<LeaderboardRow[]>;
  getGlobalLeaderboard(configurationId: string): Promise<LeaderboardRow[]>;
}
