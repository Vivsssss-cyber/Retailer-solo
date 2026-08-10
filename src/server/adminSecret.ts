/**
 * Server-only admin PIN. Never import from client components.
 * Set ADMIN_PIN in the environment for production.
 */

const DEV_FALLBACK_PIN = "Cyan#866$R3t@il";

export function getAdminPin(): string {
  const fromEnv = process.env.ADMIN_PIN?.trim();
  if (fromEnv) return fromEnv;
  // Dev/test convenience only — production must set ADMIN_PIN.
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_PIN;
  return "";
}

export function isAdminPinConfigured(): boolean {
  return getAdminPin().length > 0;
}
