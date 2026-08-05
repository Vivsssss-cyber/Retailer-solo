import type { GameConfig } from "@/engine";

export type RulesBullet = {
  id: string;
  /** Full sentence/HTML-free text; use React strong in consumers if needed. */
  text: string;
  /** Optional segments for bold parts — consumers can render simply as `text`. */
  emphasis?: string;
};

export type RulesContent = {
  unit: string;
  unitLower: string;
  intro: string;
  bullets: RulesBullet[];
};

/**
 * Static rules copy (intro + bullets).
 * How to Play in-game now uses InteractiveTutorial; keep this for docs/coach snippets.
 */
export function getRulesContent(config: GameConfig): RulesContent {
  const unit = config.timeline_unit || "Round";
  const unitLower = unit.toLowerCase();
  const delay = config.delivery_delay;

  return {
    unit,
    unitLower,
    intro: `You are the retailer. Each ${unitLower}, customer demand arrives. Fulfil from stock (after inbound delivery). Order replenishment that arrives after a ${delay}-${unitLower} delay.`,
    bullets: [
      {
        id: "inv-cost",
        text: `Holding inventory costs $${config.inventory_cost_per_unit} per unit left at period end.`,
        emphasis: `$${config.inventory_cost_per_unit}`,
      },
      {
        id: "bl-cost",
        text: `Unmet demand becomes backlog at $${config.backlog_cost_per_unit} per unit (usually more expensive).`,
        emphasis: `$${config.backlog_cost_per_unit}`,
      },
      {
        id: "pipeline",
        text: "Check the pipeline before placing large orders — stock already in transit will arrive.",
      },
      {
        id: "goal",
        text: "Goal: finish with the lowest cumulative cost.",
        emphasis: "lowest cumulative cost",
      },
      {
        id: "endgame",
        text: `Orders that would arrive after ${unitLower} ${config.total_rounds} never arrive — same rules every period.`,
      },
    ],
  };
}
