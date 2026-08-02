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
