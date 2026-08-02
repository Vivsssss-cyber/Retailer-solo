import { ADMIN_PIN } from "@/lib/adminConfigStore";
import { ApiError } from "./errors";

/**
 * Lightweight admin gate for local/dev write endpoints.
 * Header: X-Admin-Pin: admin  (same PIN as the admin UI session).
 * Not production auth — swap for real roles later.
 */
export function requireAdminPin(request: Request): void {
  const pin =
    request.headers.get("x-admin-pin") ??
    request.headers.get("X-Admin-Pin") ??
    "";
  if (pin.trim() !== ADMIN_PIN) {
    throw new ApiError("BAD_REQUEST", "Invalid or missing admin PIN", 401);
  }
}
