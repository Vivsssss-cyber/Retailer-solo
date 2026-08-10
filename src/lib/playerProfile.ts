/**
 * Player identity (persona + display name) — cosmetic only.
 * Persists in localStorage so the chosen avatar survives refresh / play-again.
 * sessionStorage is read as a one-time migration path from older builds.
 */

import {
  isPersonaSlug,
  personaBySlug,
  type PersonaSlug,
} from "@/lib/personas";

export const PLAYER_PROFILE_KEY = "retailer-challenge-player-profile";

export interface PlayerProfile {
  persona: PersonaSlug | null;
  name: string | null;
}

const EMPTY: PlayerProfile = { persona: null, name: null };

/** Same-tab listeners for useSyncExternalStore (storage events are cross-tab only). */
const listeners = new Set<() => void>();

function emitProfileChange(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

/** Subscribe to profile writes in this tab (+ cross-tab storage events). */
export function subscribePlayerProfile(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLAYER_PROFILE_KEY || e.key === null) onStoreChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

function parseProfile(raw: string | null): PlayerProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { persona?: string | null; name?: string | null };
    const persona = isPersonaSlug(parsed.persona) ? parsed.persona : null;
    const name =
      typeof parsed.name === "string" && parsed.name.trim()
        ? parsed.name.trim()
        : null;
    if (!persona && !name) return null;
    return { persona, name };
  } catch {
    return null;
  }
}

function readStorage(storage: Storage | undefined): PlayerProfile | null {
  if (!storage) return null;
  try {
    return parseProfile(storage.getItem(PLAYER_PROFILE_KEY));
  } catch {
    return null;
  }
}

/** Read profile — prefers localStorage, falls back to sessionStorage (legacy). */
export function readPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") return EMPTY;
  const local = readStorage(window.localStorage);
  if (local) return local;
  const session = readStorage(window.sessionStorage);
  if (session) {
    // Promote legacy session entry so it survives refresh.
    writePlayerProfile(session);
    return session;
  }
  return EMPTY;
}

export function writePlayerProfile(partial: {
  persona?: PersonaSlug | "" | null;
  name?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const current = readPlayerProfile();
  const next: PlayerProfile = {
    persona:
      partial.persona === undefined
        ? current.persona
        : partial.persona && isPersonaSlug(partial.persona)
          ? partial.persona
          : null,
    name:
      partial.name === undefined
        ? current.name
        : partial.name?.trim()
          ? partial.name.trim()
          : null,
  };
  try {
    const json = JSON.stringify(next);
    window.localStorage.setItem(PLAYER_PROFILE_KEY, json);
    // Keep session in sync for any code that still reads it.
    window.sessionStorage.setItem(PLAYER_PROFILE_KEY, json);
    emitProfileChange();
  } catch {
    /* quota / private mode */
  }
}

/** Resolved avatar URL for the saved persona, or null. */
export function readPlayerAvatarSrc(): string | null {
  return personaBySlug(readPlayerProfile().persona)?.avatarSrc ?? null;
}
