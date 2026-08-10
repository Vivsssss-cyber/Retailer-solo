import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal localStorage mock so this runs without a jsdom worker. */
function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

const local = makeStorage();
const session = makeStorage();

vi.stubGlobal("window", {
  localStorage: local,
  sessionStorage: session,
  addEventListener: () => {},
  removeEventListener: () => {},
});
vi.stubGlobal("localStorage", local);
vi.stubGlobal("sessionStorage", session);

const {
  PLAYER_PROFILE_KEY,
  readPlayerProfile,
  subscribePlayerProfile,
  writePlayerProfile,
} = await import("../playerProfile");

beforeEach(() => {
  local.clear();
  session.clear();
});

describe("playerProfile", () => {
  it("writes persona without wiping an existing name", () => {
    writePlayerProfile({ persona: "the-analyst", name: "Ava" });
    writePlayerProfile({
      persona: "the-closer",
      name: readPlayerProfile().name,
    });
    const profile = readPlayerProfile();
    expect(profile.persona).toBe("the-closer");
    expect(profile.name).toBe("Ava");
  });

  it("notifies subscribers on write", () => {
    const spy = vi.fn();
    const unsub = subscribePlayerProfile(spy);
    writePlayerProfile({ persona: "the-scout", name: "Bo" });
    expect(spy).toHaveBeenCalled();
    unsub();
  });

  it("rejects unknown persona slugs", () => {
    writePlayerProfile({ persona: "not-real" as "the-scout", name: "X" });
    const raw = local.getItem(PLAYER_PROFILE_KEY);
    expect(raw).toBeTruthy();
    const profile = readPlayerProfile();
    expect(profile.persona).toBeNull();
    expect(profile.name).toBe("X");
  });
});
