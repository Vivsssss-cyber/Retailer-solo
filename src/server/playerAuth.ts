import { ApiError } from "./errors";
import { withStore } from "./store";
import { safeEqualString } from "./adminSession";

export function extractPlayerToken(request: Request): string {
  const header =
    request.headers.get("x-player-token") ??
    request.headers.get("X-Player-Token") ??
    "";
  if (header.trim()) return header.trim();
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? "";
}

/**
 * Require ownership token for attempt read/mutate.
 * Leaderboards and heat metadata stay public.
 */
export function requirePlayerToken(request: Request, attemptId: string): void {
  const token = extractPlayerToken(request);
  if (!token) {
    throw new ApiError(
      "FORBIDDEN",
      "Missing player token. Rejoin the heat with the access code or QR link.",
      401,
    );
  }
  const ok = withStore((store) => {
    const attempt = store.attempts[attemptId];
    if (!attempt) {
      throw new ApiError("ATTEMPT_NOT_FOUND", `Attempt not found: ${attemptId}`);
    }
    const expected = attempt.player_token ?? "";
    if (!expected || !safeEqualString(expected, token)) {
      return false;
    }
    return true;
  });
  if (!ok) {
    throw new ApiError(
      "FORBIDDEN",
      "Invalid player token for this attempt.",
      401,
    );
  }
}
