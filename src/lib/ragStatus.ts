/**
 * Red / Amber / Green status for play KPIs.
 * v1: backlog is authoritative; inventory is secondary; no cost RAG
 * (early cumulative cost is naturally low and misleads).
 */

export type RagLevel = "green" | "amber" | "red";

export type RagDescriptor = {
  level: RagLevel;
  /** Short accessible label (not color-only). */
  label: string;
  border: string;
  dot: string;
};

const RAG: Record<RagLevel, Omit<RagDescriptor, "level" | "label">> = {
  green: {
    border: "var(--sv-success)",
    dot: "var(--sv-success)",
  },
  amber: {
    border: "var(--sv-warning)",
    dot: "var(--sv-warning)",
  },
  red: {
    border: "var(--sv-negative)",
    dot: "var(--sv-negative)",
  },
};

/**
 * Backlog RAG.
 * 0 = healthy, 1..threshold = watch, >threshold = critical.
 * Default threshold = max(2, demand) so a single unit is amber, not red.
 */
export function backlogRag(
  backlog: number,
  demand = 0,
  threshold?: number,
): RagDescriptor {
  const t = threshold ?? Math.max(2, demand);
  if (backlog <= 0) {
    return { level: "green", label: "Healthy", ...RAG.green };
  }
  if (backlog <= t) {
    return { level: "amber", label: "Watch", ...RAG.amber };
  }
  return { level: "red", label: "Critical", ...RAG.red };
}

/**
 * Inventory RAG — stockout risk vs excess holding (simple bands).
 * - 0 with demand pressure → red
 * - 0 with no demand → amber (edge)
 * - very high vs starting band → amber (overstock)
 * - else green
 */
export function inventoryRag(
  inventory: number,
  demand: number,
  backlog: number,
  /** Soft excess band; defaults to ~2× starting-ish buffer. */
  highBand = 24,
): RagDescriptor {
  if (inventory <= 0 && (demand > 0 || backlog > 0)) {
    return { level: "red", label: "Stockout risk", ...RAG.red };
  }
  if (inventory <= 0) {
    return { level: "amber", label: "Empty", ...RAG.amber };
  }
  if (inventory >= highBand) {
    return { level: "amber", label: "High stock", ...RAG.amber };
  }
  return { level: "green", label: "Healthy", ...RAG.green };
}
