"use client";

import { useMemo, useState } from "react";
import type { Attempt, RoundRecord, UiPhase } from "@/engine";
import { getEarlyRoundTip, getRoundCoaching } from "@/lib/coaching";
import { CoachOverlay, type CoachOverlayMessage } from "@/components/coach";

type PlayCoachOverlayProps = {
  attempt: Attempt;
  phase: UiPhase;
  lastRecord: RoundRecord | null;
  /** Completed rounds count (attempt.rounds.length). */
  completedRounds: number;
  /** Rounds 1–2 progressive density — stronger / more frequent coach. */
  earlyGame?: boolean;
  /** True once charts/history are available (round 3+). */
  showFullAnalytics?: boolean;
};

/** Appear on rounds 1, 4, 7, 10… (~every 3 rounds) plus configured tip rounds. */
function isCadenceRound(round: number): boolean {
  return (round - 1) % 3 === 0;
}

/**
 * Coach pops in on the decide screen with a tip or post-round recommendation,
 * then auto-fades after speaking. Early game holds longer and speaks more often.
 */
export function PlayCoachOverlay({
  attempt,
  phase,
  lastRecord,
  completedRounds,
  earlyGame = false,
  showFullAnalytics = true,
}: PlayCoachOverlayProps) {
  const [dismissState, setDismissState] = useState(() => ({
    attemptId: attempt.attempt_id,
    ids: new Set<string>(),
  }));

  // Derive dismissed set for the current attempt without an effect reset.
  const dismissed =
    dismissState.attemptId === attempt.attempt_id
      ? dismissState.ids
      : new Set<string>();

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
        label: "Round tip",
      };
    }

    // Progressive density: stronger early-game teaching beats
    if (earlyGame || currentRound === 3) {
      const early = getEarlyRoundTip(currentRound, completedRounds, lastRecord);
      if (early) {
        return {
          id: `early-${attempt.attempt_id}-${currentRound}-${early.tone}`,
          text: early.message,
          tone: early.tone,
          label: earlyGame ? "Coach" : "Unlocked",
        };
      }
    }

    // Early game: always coach after a settled round (not only cadence)
    const showPostRound =
      lastRecord != null &&
      lastRecord.round === completedRounds &&
      completedRounds > 0;

    if (showPostRound && lastRecord && (earlyGame || isCadenceRound(currentRound))) {
      const coaching = getRoundCoaching(lastRecord);
      return {
        id: `coach-${attempt.attempt_id}-${lastRecord.round}-${coaching.tone}`,
        text: coaching.message,
        tone: coaching.tone,
        label: coaching.tone === "ok" ? "Nice work" : "Watch this",
      };
    }

    // Opening beat on round 1 when no info_panel / early tip already handled
    if (currentRound === 1 && completedRounds === 0) {
      return {
        id: `open-${attempt.attempt_id}`,
        text: showFullAnalytics
          ? "Orders take time to arrive. Check the pipeline before you crank up the order."
          : "Orders take time to arrive. Check inventory, demand, and the pipeline — then place your order.",
        tone: "tip",
        label: "Coach",
      };
    }

    // Cadence coaching mid/late game without a fresh lastRecord match
    if (!earlyGame && isCadenceRound(currentRound) && !showPostRound) {
      return {
        id: `cadence-${attempt.attempt_id}-${currentRound}`,
        text: "Glance at the charts: is your order pattern smoother than demand, or amplifying it?",
        tone: "tip",
        label: "Check-in",
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
    earlyGame,
    showFullAnalytics,
  ]);

  const active = message && !dismissed.has(message.id) ? message : null;
  // Early game: hold longer so teaching sticks
  const holdMs = earlyGame ? 3800 : 2200;

  return (
    <CoachOverlay
      message={active}
      onDismiss={() => {
        if (!active) return;
        setDismissState((prev) => {
          const base =
            prev.attemptId === attempt.attempt_id ? prev.ids : new Set<string>();
          return {
            attemptId: attempt.attempt_id,
            ids: new Set(base).add(active.id),
          };
        });
      }}
      holdMs={holdMs}
      fadeMs={450}
    />
  );
}
