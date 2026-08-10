/** Shared client/server-facing API error (live fetch + mock). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

/** Normalize mock + live errors into a user-facing message + optional code. */
export function parseApiFailure(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiRequestError) {
    return { message: friendlyMessage(err.code, err.message), code: err.code };
  }
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code;
    return { message: friendlyMessage(code, err.message), code };
  }
  return { message: "Something went wrong. Try again." };
}

function friendlyMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "HEAT_FULL":
      return "This room is full. Ask the facilitator for a new room, or join a different code.";
    case "ALREADY_ATTEMPTED":
      return "You already used your official attempt for this room. Use Solo practice, or join with a different identity.";
    case "HEAT_NOT_FOUND":
      return (
        fallback ||
        "Room not found. Check the code (no typos). Mock mode only works in this same browser — use NEXT_PUBLIC_USE_MOCK=false for real multiplayer."
      );
    case "BAD_REQUEST":
      return fallback || "Invalid request. Check your details and try again.";
    case "ATTEMPT_NOT_FOUND":
      return "That game session was not found. Start a new one from the home screen.";
    case "ATTEMPT_COMPLETED":
      return "This attempt is already finished.";
    case "ROUND_LOCKED":
      return "That round was already submitted.";
    case "ROUND_MISMATCH":
      return "Your round is out of sync. Refresh the page to continue.";
    case "INVALID_ORDER":
      return "Order must be a whole number within the allowed range.";
    default:
      return fallback || "Something went wrong. Try again.";
  }
}

const STATUS_BY_CODE: Record<string, number> = {
  HEAT_FULL: 409,
  ALREADY_ATTEMPTED: 409,
  HEAT_NOT_FOUND: 404,
  ATTEMPT_NOT_FOUND: 404,
  ATTEMPT_COMPLETED: 409,
  ROUND_LOCKED: 409,
  ROUND_MISMATCH: 409,
  INVALID_ORDER: 400,
};

/** Attach a machine code (mock adapter parity with live API). */
export function errorWithCode(code: string, message: string): ApiRequestError {
  return new ApiRequestError(message, STATUS_BY_CODE[code] ?? 400, code);
}
