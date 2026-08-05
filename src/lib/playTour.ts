import type { GameConfig } from "@/engine";
import type { CoachTone } from "@/components/coach/CoachSpeech";

export type PlayTourTarget = "kpis" | "history" | "graphs" | "order" | null;

export type PlayTourStep = {
  id: string;
  /** DOM `data-tour` value, or null for final closing line with no hole. */
  target: PlayTourTarget;
  text: string;
  tone: CoachTone;
  label: string;
};

export const PLAY_TOUR_DONE_KEY = "retailer-challenge-play-tour-done-v1";
/** Prior first-play brief — treat as already completed so we don't re-tour veterans. */
export const PLAY_BRIEF_DONE_KEY = "retailer-challenge-play-brief-done-v1";
export const TUTORIAL_DONE_KEY = "retailer-challenge-tutorial-done-v1";

/**
 * Auto-start spotlight only if the real tour (or old brief) was finished.
 * InteractiveTutorial alone does not suppress the focused-element tour —
 * How to Play and first-run share the same spotlight path.
 */
export function hasCompletedPlayTour(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(PLAY_TOUR_DONE_KEY) === "1") return true;
    if (window.localStorage.getItem(PLAY_BRIEF_DONE_KEY) === "1") return true;
    return false;
  } catch {
    return false;
  }
}

export function markPlayTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAY_TOUR_DONE_KEY, "1");
    window.localStorage.setItem(PLAY_BRIEF_DONE_KEY, "1");
    window.localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

/** Coach-led spotlight steps on the live play shell. */
export function getPlayTourSteps(config: GameConfig): PlayTourStep[] {
  const unit = (config.timeline_unit || "Round").toLowerCase();
  const delay = config.delivery_delay;
  const delayLabel =
    delay === 1
      ? `1 ${unit}`
      : `${delay} ${unit}${unit.endsWith("s") ? "" : "s"}`;
  const inv = config.inventory_cost_per_unit;
  const bl = config.backlog_cost_per_unit;

  return [
    {
      id: "kpis",
      target: "kpis",
      label: "Your warehouse",
      tone: "tip",
      text: `These cards are warehouse health. Inventory costs $${inv}/unit; backlog costs $${bl}/unit — usually worse. Green is fine, amber means watch, red means fix.`,
    },
    {
      id: "history",
      target: "history",
      label: "Game progress",
      tone: "tip",
      text: `Each ${unit} lands here — stock, backlog, demand, your order, and cost. Orders take ${delayLabel} to arrive, so watch history before you crank the order.`,
    },
    {
      id: "graphs",
      target: "graphs",
      label: "Trends",
      tone: "tip",
      text: "Left chart: inventory, backlog, and demand over time. Right chart: how cost builds. Quiet at first — they fill as you play.",
    },
    {
      id: "order",
      target: "order",
      label: "Your move",
      tone: "tip",
      text: `Your only decision each ${unit}: how much to order. It does not arrive instantly — it shows up after the delay.`,
    },
    {
      id: "go",
      target: null,
      label: "Ready",
      tone: "ok",
      text: "Lowest total cost wins. Place your first order when you're ready — I'll chime in if something looks off.",
    },
  ];
}
