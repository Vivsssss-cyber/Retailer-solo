/**
 * Client-side storage for per-attempt player ownership tokens.
 * Tokens are issued once at createAttempt and required for live API mutations.
 */

const PREFIX = "retailer-challenge-player-token:";

export function persistPlayerToken(attemptId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${attemptId}`, token);
  } catch {
    /* ignore */
  }
}

export function readPlayerToken(attemptId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(`${PREFIX}${attemptId}`);
  } catch {
    return null;
  }
}

export function clearPlayerToken(attemptId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${PREFIX}${attemptId}`);
  } catch {
    /* ignore */
  }
}
