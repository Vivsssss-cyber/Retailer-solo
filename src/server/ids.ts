import { randomBytes } from "crypto";

/** Short unique id: prefix_ + random */
export function makeId(prefix: string): string {
  const rand = randomBytes(6).toString("hex");
  return `${prefix}_${rand}`;
}

/**
 * Human-friendly heat access code (A-Z0-9, no I/O/0/1).
 * Multiplayer classroom codes use 8 chars; solo uses 6 after SOLO- prefix.
 */
export function makeAccessCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const n = Math.min(12, Math.max(4, Math.floor(length) || 8));
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/** Opaque player ownership token (returned once at attempt create). */
export function makePlayerToken(): string {
  return randomBytes(24).toString("hex");
}
