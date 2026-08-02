import type { GameConfig } from "@/engine";
import { ADMIN_PIN } from "@/lib/adminConfigStore";
import type { RetailerChallengeApi } from "./types";
import { mockAdapter } from "./mockAdapter";
import { ApiRequestError } from "./apiErrors";

/**
 * Live REST client — used when NEXT_PUBLIC_USE_MOCK is "false".
 * With empty NEXT_PUBLIC_API_URL, calls same-origin Next.js API routes.
 */
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

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
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; code?: string };
      if (body.error) message = body.error;
      code = body.code;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {
        /* ignore */
      }
    }
    throw new ApiRequestError(message, res.status, code);
  }
  return res.json() as Promise<T>;
}

const liveApi: RetailerChallengeApi = {
  getConfiguration: (id = "default") => request(`/configurations/${id}`),
  putConfiguration: (config: GameConfig) =>
    request(`/configurations/${encodeURIComponent(config.configuration_id || "default")}`, {
      method: "PUT",
      body: JSON.stringify(config),
      headers: {
        "X-Admin-Pin": ADMIN_PIN,
      },
    }),
  createHeat: (body) =>
    request(`/heats`, { method: "POST", body: JSON.stringify(body) }),
  createAttempt: (heatId, body) =>
    request(`/heats/${encodeURIComponent(heatId)}/attempts`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAttempt: async (attemptId) => {
    try {
      return await request(`/attempts/${encodeURIComponent(attemptId)}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) return null;
      throw err;
    }
  },
  submitRound: (attemptId, body) =>
    request(`/attempts/${encodeURIComponent(attemptId)}/rounds`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  completeAttempt: (attemptId) =>
    request(`/attempts/${encodeURIComponent(attemptId)}/complete`, {
      method: "POST",
    }),
  getHeatLeaderboard: (heatId, mode) =>
    request(
      `/heats/${encodeURIComponent(heatId)}/leaderboard?mode=${mode}`,
    ),
  getGlobalLeaderboard: (configurationId) =>
    request(
      `/events/default/global-leaderboard?configuration_id=${encodeURIComponent(configurationId)}`,
    ),
};

export const api: RetailerChallengeApi = USE_MOCK ? mockAdapter : liveApi;
export { USE_MOCK };
export { ApiRequestError } from "./apiErrors";
