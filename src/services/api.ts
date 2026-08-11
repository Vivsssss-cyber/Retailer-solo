import type { GameConfig } from "@/engine";
import { isHeatId, normalizeHeatKey } from "@/lib/heatKey";
import { persistPlayerToken, readPlayerToken } from "@/lib/playerTokenStore";
import type { CreateAttemptResponse, RetailerChallengeApi } from "./types";
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
    credentials: "include",
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
  return res.json() as T;
}

function playerHeaders(attemptId: string): HeadersInit {
  const token = readPlayerToken(attemptId);
  return token ? { "X-Player-Token": token } : {};
}

/** Route create-attempt: heat_ ids vs access codes (by-code path). */
function attemptPath(heatIdOrCode: string): string {
  const key = normalizeHeatKey(heatIdOrCode);
  if (isHeatId(key)) {
    return `/heats/${encodeURIComponent(key)}/attempts`;
  }
  // Access codes: dedicated by-code route (avoids ambiguous dynamic segments)
  return `/heats/by-code/${encodeURIComponent(key)}/attempts`;
}

/** Leaderboard / get-heat: [heatId] route also accepts access codes server-side. */
function heatPath(heatIdOrCode: string, suffix: string): string {
  const key = normalizeHeatKey(heatIdOrCode);
  return `/heats/${encodeURIComponent(key)}${suffix}`;
}

const liveApi: RetailerChallengeApi = {
  getConfiguration: (id = "default") => request(`/configurations/${id}`),
  putConfiguration: (config: GameConfig) =>
    request(`/configurations/${encodeURIComponent(config.configuration_id || "default")}`, {
      method: "PUT",
      body: JSON.stringify(config),
      // Cookie session after adminLogin — no PIN in client bundle
    }),
  /** Public solo create — never send multiplayer without adminCreateRoom. */
  createHeat: (body) =>
    request(`/heats`, {
      method: "POST",
      body: JSON.stringify({ ...body, solo: body.solo === true }),
    }),
  /** Multiplayer room: requires admin session cookie (credentials: include). */
  adminCreateRoom: (body = {}) =>
    request(`/heats`, {
      method: "POST",
      body: JSON.stringify({ ...body, solo: false }),
    }),
  getHeat: (heatIdOrCode) => request(heatPath(heatIdOrCode, "")),
  createAttempt: async (heatId, body) => {
    const result = await request<CreateAttemptResponse>(attemptPath(heatId), {
      method: "POST",
      body: JSON.stringify(body),
    });
    persistPlayerToken(result.attempt.attempt_id, result.player_token);
    return result;
  },
  getAttempt: async (attemptId) => {
    try {
      return await request(`/attempts/${encodeURIComponent(attemptId)}`, {
        headers: playerHeaders(attemptId),
      });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) return null;
      throw err;
    }
  },
  submitRound: (attemptId, body) =>
    request(`/attempts/${encodeURIComponent(attemptId)}/rounds`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: playerHeaders(attemptId),
    }),
  completeAttempt: (attemptId) =>
    request(`/attempts/${encodeURIComponent(attemptId)}/complete`, {
      method: "POST",
      headers: playerHeaders(attemptId),
    }),
  getHeatLeaderboard: (heatId, mode) =>
    request(`${heatPath(heatId, "/leaderboard")}?mode=${mode}`),
  getGlobalLeaderboard: (configurationId) =>
    request(
      `/events/default/global-leaderboard?configuration_id=${encodeURIComponent(configurationId)}`,
    ),
  adminLogin: (pin: string) =>
    request(`/admin/login`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
  adminLogout: () =>
    request(`/admin/logout`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  adminSession: () => request<{ authenticated: boolean }>(`/admin/session`),
  getAdminData: () => request(`/admin/data`),
  clearAdminData: () =>
    request(`/admin/clear`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  toggleHeatStatus: (heatId) =>
    request(`/admin/heats/${encodeURIComponent(heatId)}`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  deleteHeat: (heatId) =>
    request(`/admin/heats/${encodeURIComponent(heatId)}`, {
      method: "DELETE",
    }),
};

export const api: RetailerChallengeApi = USE_MOCK ? mockAdapter : liveApi;
export { USE_MOCK };
export { ApiRequestError } from "./apiErrors";
