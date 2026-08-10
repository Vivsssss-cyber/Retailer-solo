/** Structured API errors matching docs/BACKEND_GUIDE.md §7 */

export type ErrorCode =
  | "HEAT_NOT_FOUND"
  | "HEAT_FULL"
  | "ATTEMPT_NOT_FOUND"
  | "ALREADY_ATTEMPTED"
  | "ROUND_LOCKED"
  | "ROUND_MISMATCH"
  | "ATTEMPT_COMPLETED"
  | "INVALID_ORDER"
  | "CONFIG_MISMATCH"
  | "CONFIG_NOT_FOUND"
  | "EVENT_NOT_FOUND"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL";

const HTTP_BY_CODE: Record<ErrorCode, number> = {
  HEAT_NOT_FOUND: 404,
  HEAT_FULL: 409,
  ATTEMPT_NOT_FOUND: 404,
  ALREADY_ATTEMPTED: 409,
  ROUND_LOCKED: 409,
  ROUND_MISMATCH: 409,
  ATTEMPT_COMPLETED: 409,
  INVALID_ORDER: 400,
  CONFIG_MISMATCH: 400,
  CONFIG_NOT_FOUND: 404,
  EVENT_NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 401,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status ?? HTTP_BY_CODE[code] ?? 500;
  }

  toJSON() {
    return { error: this.message, code: this.code };
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
