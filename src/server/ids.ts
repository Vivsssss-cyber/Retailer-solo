import { randomBytes } from "crypto";

/** Short unique id: prefix_ + random */
export function makeId(prefix: string): string {
  const rand = randomBytes(6).toString("hex");
  return `${prefix}_${rand}`;
}

/** Human-friendly heat access code (6 chars, A-Z0-9). */
export function makeAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
