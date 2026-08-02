import type { RetailerChallengeApi } from "./types";
import { mockAdapter } from "./mockAdapter";

/**
 * Live REST client (wired when NEXT_PUBLIC_API_URL is set and mock is off).
 * For v1 demo, mockAdapter is default.
 */
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false" || !process.env.NEXT_PUBLIC_API_URL;

const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}/api/retailer-challenge${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

const liveApi: RetailerChallengeApi = {
  getConfiguration: (id = "default") => request(`/configurations/${id}`),
  createHeat: (body) =>
    request(`/heats`, { method: "POST", body: JSON.stringify(body) }),
  createAttempt: (heatId, body) =>
    request(`/heats/${heatId}/attempts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAttempt: (attemptId) => request(`/attempts/${attemptId}`),
  submitRound: (attemptId, body) =>
    request(`/attempts/${attemptId}/rounds`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  completeAttempt: (attemptId) =>
    request(`/attempts/${attemptId}/complete`, { method: "POST" }),
  getHeatLeaderboard: (heatId, mode) =>
    request(`/heats/${heatId}/leaderboard?mode=${mode}`),
  getGlobalLeaderboard: (configurationId) =>
    request(`/events/default/global-leaderboard?configuration_id=${configurationId}`),
};

export const api: RetailerChallengeApi = USE_MOCK ? mockAdapter : liveApi;
export { USE_MOCK };
