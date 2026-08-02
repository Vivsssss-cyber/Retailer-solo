import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { DEFAULT_CONFIG } from "@/engine";
import { emptyStore, type DataStore } from "./types";

/**
 * File-backed JSON store for local/dev single-node use.
 * Swap for Postgres later without changing service API.
 *
 * Path: DATA_DIR env or <cwd>/.data/retailer-challenge.json
 * Not safe for multi-instance serverless without external DB.
 */

const DEFAULT_EVENT_ID = "default";

function dataPath(): string {
  if (process.env.DATA_DIR) {
    return path.join(process.env.DATA_DIR, "retailer-challenge.json");
  }
  return path.join(process.cwd(), ".data", "retailer-challenge.json");
}

function seedStore(): DataStore {
  const store = emptyStore();
  const config = structuredClone(DEFAULT_CONFIG);
  store.configurations[config.configuration_id] = config;
  store.configurations["default"] = config;
  store.events[DEFAULT_EVENT_ID] = {
    event_id: DEFAULT_EVENT_ID,
    name: "Default event",
    configuration_id: config.configuration_id,
  };
  return store;
}

let memory: DataStore | null = null;
let writeChain: Promise<void> = Promise.resolve();

function ensureSeeded(store: DataStore): DataStore {
  if (!store.configurations || Object.keys(store.configurations).length === 0) {
    const seeded = seedStore();
    return {
      ...seeded,
      ...store,
      configurations: { ...seeded.configurations, ...store.configurations },
      events: { ...seeded.events, ...store.events },
    };
  }
  // Always keep default aliases fresh enough to resolve
  if (!store.configurations["default"] && store.configurations[DEFAULT_CONFIG.configuration_id]) {
    store.configurations["default"] = store.configurations[DEFAULT_CONFIG.configuration_id]!;
  }
  if (!store.events[DEFAULT_EVENT_ID]) {
    store.events[DEFAULT_EVENT_ID] = {
      event_id: DEFAULT_EVENT_ID,
      name: "Default event",
      configuration_id: DEFAULT_CONFIG.configuration_id,
    };
  }
  return store;
}

function readFromDisk(): DataStore {
  const file = dataPath();
  try {
    if (!existsSync(file)) return seedStore();
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<DataStore>;
    return ensureSeeded({ ...emptyStore(), ...parsed } as DataStore);
  } catch {
    return seedStore();
  }
}

function memoryOnly(): boolean {
  return (
    process.env.RETAILER_STORE_MEMORY === "1" ||
    process.env.VITEST === "true" ||
    process.env.NODE_ENV === "test"
  );
}

function writeToDisk(store: DataStore): void {
  if (memoryOnly()) return;
  const file = dataPath();
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  renameSync(tmp, file);
}

/** Load store (memory-cached). */
export function loadStore(): DataStore {
  if (!memory) {
    memory = memoryOnly() ? seedStore() : readFromDisk();
  }
  return memory;
}

/** Mutate store under a write queue and persist. */
export async function updateStore<T>(
  fn: (store: DataStore) => T,
): Promise<T> {
  const run = writeChain.then(() => {
    const store = loadStore();
    const result = fn(store);
    memory = store;
    writeToDisk(store);
    return result;
  });
  // Keep chain alive even if this write fails
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Read-only access (no write). */
export function withStore<T>(fn: (store: DataStore) => T): T {
  return fn(loadStore());
}

/** Test helper: replace store and optionally skip disk. */
export function resetStoreForTests(initial?: DataStore): void {
  memory = initial ? ensureSeeded(initial) : seedStore();
  // Don't write to real disk path during unit tests unless DATA_DIR set
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    // still allow memory-only unless DATA_DIR forces path
  }
}

/** Force re-read from disk (e.g. after external edit). */
export function invalidateStoreCache(): void {
  memory = null;
}

export { DEFAULT_EVENT_ID };
