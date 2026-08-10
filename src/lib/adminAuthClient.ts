/**
 * Client-side admin session helpers (UI flag + server cookie).
 * Never stores ADMIN_PIN in the browser for live mode.
 */

import { lockAdmin } from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
import { ApiRequestError } from "@/services/apiErrors";

export function isAdminAuthFailure(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    if (err.status === 401 || err.status === 403) return true;
    const code = (err.code ?? "").toUpperCase();
    return code === "FORBIDDEN" || code === "UNAUTHORIZED";
  }
  if (err instanceof Error) {
    const code = ((err as Error & { code?: string }).code ?? "").toUpperCase();
    if (code === "FORBIDDEN" || code === "UNAUTHORIZED") return true;
    return /invalid or missing admin|incorrect admin pin|admin authentication|admin credentials/i.test(
      err.message,
    );
  }
  return false;
}

/** Clear local unlock + server session, then force PIN screen. */
export async function logoutAdmin(): Promise<void> {
  lockAdmin();
  if (!USE_MOCK) {
    try {
      await api.adminLogout();
    } catch {
      /* cookie may already be gone after deploy */
    }
  }
}

/** Logout and hard-navigate so AdminGate re-mounts locked. */
export async function logoutAdminAndReload(href = "/admin"): Promise<void> {
  await logoutAdmin();
  window.location.href = href;
}

/**
 * If the error is missing/expired admin auth, log out and reload.
 * @returns true when handled (caller should not show a stale error).
 */
export function handleAdminAuthFailure(err: unknown): boolean {
  if (!isAdminAuthFailure(err)) return false;
  void logoutAdminAndReload();
  return true;
}
