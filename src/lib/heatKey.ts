/**
 * Normalize heat id or access code for lookups.
 * Codes are case-insensitive; whitespace ignored; heat_ ids kept as-is.
 * Keeps hyphens so SOLO-ABC123 stays valid.
 */
export function normalizeHeatKey(heatIdOrCode: string): string {
  const raw = (heatIdOrCode ?? "").trim().replace(/\s+/g, "");
  if (!raw) return "";
  // heat ids are opaque (heat_…)
  if (raw.toLowerCase().startsWith("heat_")) {
    return `heat_${raw.slice(5)}`;
  }
  return raw.toUpperCase();
}

export function isHeatId(key: string): boolean {
  return normalizeHeatKey(key).startsWith("heat_");
}

/** Index key for access-code maps (always uppercase, no spaces). */
export function codeIndexKey(accessCode: string): string {
  return normalizeHeatKey(accessCode);
}
