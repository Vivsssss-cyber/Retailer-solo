"use client";

import { useEffect, useMemo, useState } from "react";
import type { Attempt, RoundRecord, UiPhase } from "@/engine";
import { getRoundCoaching } from "@/lib/coaching";
import { CoachOverlay, type CoachOverlayMessage } from "@/components/coach";

type PlayCoachOverlayProps = {
  attempt: Attempt;
  phase: UiPhase;
  lastRecord: RoundRecord | null;
  /** Completed rounds count (attempt.rounds.length). */
  completedRounds: number;
};

/** Appear on rounds 1, 4, 7, 10… (~every 3 rounds) plus configured tip rounds. */
function isCadenceRound(round: number): boolean {
  return (round - 1) % 3 === 0;
}

/**
 * Coach pops in every ~2–3 rounds on the decide screen with a tip or
 * post-round recommendation, then auto-fades after speaking.
 */
export function PlayCoachOverlay({
  attempt,
  phase,
  lastRecord,
  completedRounds,
}: PlayCoachOverlayProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setDismissed(new Set());
  }, [attempt.attempt_id]);

  const currentRound = attempt.current_round;

  const message = useMemo((): CoachOverlayMessage | null => {
    if (phase !== "decide") return null;

    const panel = attempt.configuration.info_panels?.find((p) => p.round === currentRound);
    const panelText = panel?.text?.trim();

    // Always honor admin-configured tip rounds (even off cadence)
    if (panelText) {
      return {
        id: `tip-${attempt.attempt_id}-${currentRound}`,
        text: panelText,
        tone: "tip",
      };
    }

    // Cadence coaching: every ~3 rounds after a completed round
    const onCadence = isCadenceRound(currentRound);
    if (!onCadence) return null;

    const showCoaching =
      lastRecord != null &&
      lastRecord.round === completedRounds &&
      completedRounds > 0;

    if (showCoaching && lastRecord) {
      const coaching = getRoundCoaching(lastRecord);
      return {
        id: `coach-${attempt.attempt_id}-${lastRecord.round}-${coaching.tone}`,
        text: coaching.message,
        tone: coaching.tone,
      };
    }

    // Opening beat on round 1 when no info_panel is configured
    if (currentRound === 1 && completedRounds === 0) {
      return {
        id: `open-${attempt.attempt_id}`,
        text: "Orders take time to arrive. Check the pipeline before you crank up the order.",
        tone: "tip",
      };
    }

    return null;
  }, [
    phase,
    attempt.attempt_id,
    attempt.configuration.info_panels,
    currentRound,
    lastRecord,
    completedRounds,
  ]);

  const active =
    message && !dismissed.has(message.id) ? message : null;

  return (
    <CoachOverlay
      message={active}
      onDismiss={() => {
        if (!active) return;
        setDismissed((prev) => new Set(prev).add(active.id));
      }}
      holdMs={2200}
      fadeMs={450}
    />
  );
}
