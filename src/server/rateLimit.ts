/**
 * Simple in-memory sliding-window rate limiter (single-node).
 * Not multi-instance safe — swap for Redis when scaling.
 */

import { ApiError } from "./errors";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Unique key, e.g. `admin-login:1.2.3.4` */
  key: string;
  /** Max events in the window */
  limit: number;
  /** Window length in ms */
  windowMs: number;
}

export function assertRateLimit(opts: RateLimitOptions): void {
  const now = Date.now();
  const windowStart = now - opts.windowMs;
  let bucket = buckets.get(opts.key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(opts.key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);
  if (bucket.timestamps.length >= opts.limit) {
    throw new ApiError(
      "RATE_LIMITED",
      "Too many requests. Slow down and try again.",
      429,
    );
  }
  bucket.timestamps.push(now);
}

export function clientIpFromRequest(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/** Test helper */
export function __resetRateLimitsForTests(): void {
  buckets.clear();
}
