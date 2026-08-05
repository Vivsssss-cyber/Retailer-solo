import type { RoundRecord } from "@/engine";

/** Mid-round coaching messages (prototype-style, PRD costs). */
export function getRoundCoaching(record: RoundRecord): {
  tone: "ok" | "warn" | "danger";
  message: string;
} {
  if (record.ending_backlog > 10) {
    return {
      tone: "danger",
      message:
        "High backlog — unfilled demand is stacking. Consider earlier replenishment, but watch the pipeline.",
    };
  }
  if (record.ending_backlog > 0) {
    return {
      tone: "warn",
      message:
        "You could not fully meet demand this round. Backlog is building and costs more than inventory.",
    };
  }
  if (record.ending_inventory > 20) {
    return {
      tone: "warn",
      message:
        "Excess inventory on hand. Large orders already in transit will raise holding cost further.",
    };
  }
  if (record.ending_inventory <= 2) {
    return {
      tone: "warn",
      message: "Stock is very low. Without inbound supply you risk backlog next rounds.",
    };
  }
  if (record.round_cost > 100) {
    return {
      tone: "warn",
      message: "Round cost is high. Review whether inventory or backlog is driving spend.",
    };
  }
  return {
    tone: "ok",
    message: "Balanced round — inventory and service look under control.",
  };
}

/**
 * Stronger teaching tips for rounds 1–2 (progressive density).
 * Prefer these over cadence-only tips while the UI is simplified.
 */
export function getEarlyRoundTip(
  currentRound: number,
  completedRounds: number,
  lastRecord: RoundRecord | null,
): { tone: "ok" | "warn" | "danger" | "tip"; message: string } | null {
  // Opening beat — round 1, nothing settled yet
  if (currentRound === 1 && completedRounds === 0) {
    return {
      tone: "tip",
      message:
        "You are the Retailer on the rail. Watch Received, Ordered, and Shipped — then place your order. It arrives after the delay.",
    };
  }

  // After round 1 settles → on round 2 decide
  if (currentRound === 2 && lastRecord?.round === 1) {
    const coaching = getRoundCoaching(lastRecord);
    if (coaching.tone !== "ok") {
      return {
        tone: coaching.tone,
        message: `${coaching.message} Charts unlock next round — focus on the pipeline for now.`,
      };
    }
    return {
      tone: "tip",
      message:
        "Round 2: orders you placed last round are still in transit. Don't double-order the same need.",
    };
  }

  // Entering round 3 (full UI unlock)
  if (currentRound === 3 && completedRounds === 2) {
    return {
      tone: "tip",
      message:
        "Charts and round history are unlocked. Use them to spot demand swings vs your orders.",
    };
  }

  return null;
}
