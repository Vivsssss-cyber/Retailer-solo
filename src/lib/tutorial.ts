/**
 * First-run teaching flags.
 * - Play tour (dark overlay + focused UI) — onboarding walkthrough + How to Play.
 * - InteractiveTutorial — legacy sample-order card (unused on main path).
 * - Play brief — superseded by tour; still honored for migration.
 */

export {
  PLAY_TOUR_DONE_KEY,
  PLAY_BRIEF_DONE_KEY,
  TUTORIAL_DONE_KEY,
  hasCompletedPlayTour,
  markPlayTourDone,
} from "@/lib/playTour";

import {
  PLAY_BRIEF_DONE_KEY,
  PLAY_TOUR_DONE_KEY,
  TUTORIAL_DONE_KEY,
  hasCompletedPlayTour,
  markPlayTourDone,
} from "@/lib/playTour";

export function hasCompletedTutorial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTutorialDone(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

/** @deprecated Prefer hasCompletedPlayTour — brief replaced by spotlight tour. */
export function hasCompletedPlayBrief(): boolean {
  return hasCompletedPlayTour();
}

/** @deprecated Prefer markPlayTourDone. */
export function markPlayBriefDone(): void {
  markPlayTourDone();
  // ensure keys for older code paths
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAY_BRIEF_DONE_KEY, "1");
    window.localStorage.setItem(PLAY_TOUR_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}
