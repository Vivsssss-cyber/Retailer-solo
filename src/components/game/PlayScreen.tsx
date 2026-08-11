"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GridBackground, PageTransition, FO } from "@/components/cyan";
import { useAttemptStore } from "@/store/useAttemptStore";
import { GameHeader } from "./GameHeader";
import { livePositionFor } from "./ChallengeHeader";
import { StatusStrip } from "./StatusStrip";
import { SupplyChainAnimation } from "./SupplyChainAnimation";
import { DecisionPanel } from "./DecisionPanel";
import { LiveLeaderboard } from "./LiveLeaderboard";
import { TrendPanel } from "./TrendPanel";
import { RoundHistoryTable } from "./RoundHistoryTable";
import { PlayTour } from "./PlayTour";
import { PlayCoachOverlay } from "./PlayCoachOverlay";
import { PerformanceReportView } from "@/components/report/PerformanceReport";
import { migrateGameConfig } from "@/engine";
import { hasCompletedPlayTour } from "@/lib/playTour";

export function PlayScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  /**
   * Focused-element coach tour (dark overlay + spotlight).
   * Auto-starts once; How to Play reopens it anytime.
   * Default false for SSR hydrate parity; promote after mount if needed.
   */
  const [tourActive, setTourActive] = useState(false);
  /** True when user reopened via How to play (not first-run auto). */
  const [tourReplay, setTourReplay] = useState(false);

  useEffect(() => {
    // Defer past hydrate so SSR markup matches first paint.
    const id = window.requestAnimationFrame(() => {
      if (!hasCompletedPlayTour()) setTourActive(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);
  const {
    attempt,
    opening,
    lastRecord,
    phase,
    orderInput,
    leaderboard,
    globalBoard,
    report,
    heatRank,
    globalRank,
    heatWinnerCost,
    heatAccessCode,
    error,
    submitting,
    hydrate,
    setOrderInput,
    confirmOrder,
    finishRoundSummary,
    playAgain,
    reset,
  } = useAttemptStore();

  useEffect(() => {
    void hydrate(attemptId);
  }, [attemptId, hydrate]);

  const pollAttemptId = attempt?.attempt_id;
  const pollStatus = attempt?.status;

  // Live heat board: poll while playing (PRD / backend guide: 3–5s).
  useEffect(() => {
    if (!pollAttemptId || pollStatus === "completed" || phase === "report") {
      return;
    }
    const POLL_MS = 4000;
    const tick = () => {
      void useAttemptStore.getState().refreshLeaderboards();
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollAttemptId, pollStatus, phase]);

  if (!attempt) {
    return (
      <GridBackground>
        <main
          className="max-w-[1288px] mx-auto px-4 sm:px-6 py-12 sm:py-16"
          style={{ fontFamily: FO }}
        >
          {error ? (
            <p style={{ color: "var(--sv-negative)" }}>{error}</p>
          ) : (
            <p style={{ color: "var(--sv-text-secondary)" }}>Loading attempt…</p>
          )}
        </main>
      </GridBackground>
    );
  }

  if (phase === "report" && report) {
    return (
      <GridBackground>
        <PageTransition>
          <main className="max-w-[1288px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <PerformanceReportView
              attempt={attempt}
              report={report}
              heatRank={heatRank}
              globalRank={globalRank}
              heatWinnerCost={heatWinnerCost}
              leaderboard={leaderboard}
              globalBoard={globalBoard}
              onPlayAgain={async () => {
                try {
                  const id = await playAgain();
                  router.replace(`/play/${id}`);
                } catch {
                  reset();
                  router.push("/");
                }
              }}
            />
          </main>
        </PageTransition>
      </GridBackground>
    );
  }

  const config = migrateGameConfig(attempt.configuration);
  const unit = config.timeline_unit || "Round";
  const pos = livePositionFor(leaderboard, attempt.player_name);
  const completed = attempt.rounds.length;

  // Unified post-submit: animation rail + round summary on one screen
  const isRoundFlow = phase === "animating" && lastRecord != null;
  const isFinalRound =
    !!lastRecord &&
    (attempt.status === "completed" ||
      lastRecord.round >= attempt.configuration.total_rounds);

  const tourOpen =
    tourActive && !isRoundFlow && phase !== "report" && phase !== "animating";

  return (
    <GridBackground>
      <PageTransition>
        {/*
          Mobile/tablet: scrollable stack.
          lg+: viewport-locked single-screen densify.
          Full UI from round 1 (no progressive density).
        */}
        <main
          className={[
            "max-w-[1288px] mx-auto px-3 sm:px-4 md:px-6 flex flex-col gap-2 sm:gap-3 md:gap-4",
            // Round summary: lock to viewport so the section scrolls inside (CTA stays reachable).
            // Decide mode: mobile scrolls the page; lg+ densified single screen.
            isRoundFlow
              ? "h-dvh max-h-dvh overflow-hidden pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              : [
                  "min-h-dvh",
                  "lg:h-dvh lg:max-h-dvh lg:overflow-hidden",
                  "overflow-x-clip overflow-y-auto lg:overflow-y-hidden",
                  "pt-3 sm:pt-4",
                  // Mobile dock stacks (header + stepper) ~150–170px; keep content clear of fixed buttons.
                  "pb-[calc(11.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-[108px]",
                ].join(" "),
          ].join(" ")}
          style={{ color: "var(--sv-text)" }}
        >
          <div className="shrink-0">
            <GameHeader
              attempt={attempt}
              livePosition={pos}
              heatAccessCode={heatAccessCode}
              onHowToPlayClick={() => {
                setTourReplay(true);
                setTourActive(true);
              }}
            />
          </div>

          {error && (
            <p
              className="shrink-0"
              style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-negative)" }}
            >
              {error}
            </p>
          )}

          {isRoundFlow && lastRecord ? (
            <div className="sv-phase-in flex-1 min-h-0 flex flex-col overflow-hidden">
              <SupplyChainAnimation
                record={lastRecord}
                attempt={attempt}
                leaderboard={leaderboard}
                isFinalRound={isFinalRound}
                onContinue={finishRoundSummary}
              />
            </div>
          ) : (
            /* Full shell every round: KPIs → dual graphs → round history + board */
            <div className="sv-phase-in flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 lg:overflow-hidden">
              <div className="shrink-0" data-tour="kpis">
                <StatusStrip
                  opening={opening}
                  lastRecord={null}
                  inventoryCost={config.inventory_cost_per_unit}
                  backlogCost={config.backlog_cost_per_unit}
                  cumulativeCost={attempt.cumulative_cost}
                  startingInventory={config.starting_inventory}
                />
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
                <div
                  data-tour="graphs"
                  className={[
                    "min-h-0 min-w-0 flex flex-col",
                    "h-[min(44svh,380px)] min-h-[220px]",
                    "sm:h-[min(40svh,400px)] sm:min-h-[240px]",
                    "lg:flex-[3] lg:h-auto lg:min-h-[200px]",
                  ].join(" ")}
                >
                  <TrendPanel rounds={attempt.rounds} dense />
                </div>

                <div
                  className={[
                    "grid grid-cols-1 lg:grid-cols-[1fr_minmax(220px,300px)] gap-3 sm:gap-4 min-h-0",
                    "shrink-0",
                    "lg:flex-[2] lg:min-h-[140px]",
                  ].join(" ")}
                >
                  <div
                    data-tour="history"
                    className="min-h-0 min-w-0 flex flex-col h-[min(36svh,220px)] lg:h-full lg:min-h-0"
                  >
                    <RoundHistoryTable
                      rounds={attempt.rounds}
                      unit={unit}
                      dense
                    />
                  </div>
                  <div
                    className={[
                      "min-w-0 flex flex-col",
                      "h-[min(28svh,200px)] min-h-[140px]",
                      "lg:h-full lg:min-h-0",
                    ].join(" ")}
                  >
                    <LiveLeaderboard
                      live={leaderboard}
                      global={globalBoard}
                      playerName={attempt.player_name}
                      dense
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Fixed bottom-center order dock — decide phase only */}
        {!isRoundFlow && (
          <DecisionPanel
            value={orderInput}
            onChange={setOrderInput}
            onConfirm={() => void confirmOrder()}
            disabled={submitting || phase !== "decide" || tourOpen}
            currentRound={attempt.current_round}
            deliveryDelay={config.delivery_delay}
            totalRounds={config.total_rounds}
            maxOrder={config.maximum_order}
            lastDemand={opening?.customerDemand ?? 0}
            backlog={opening?.openingBacklog ?? attempt.backlog}
            inventory={opening?.openingInventory ?? attempt.inventory}
            timelineUnit={unit}
          />
        )}

        {/* Mid-game coach — suppressed while spotlight tour runs */}
        {!isRoundFlow && !tourOpen && (
          <PlayCoachOverlay
            attempt={attempt}
            phase={phase}
            lastRecord={lastRecord}
            completedRounds={completed}
            earlyGame={false}
            showFullAnalytics
          />
        )}

        {tourOpen && (
          <PlayTour
            config={config}
            replay={tourReplay}
            onComplete={() => {
              setTourActive(false);
              setTourReplay(false);
            }}
          />
        )}
      </PageTransition>
    </GridBackground>
  );
}
