"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GridBackground, PageTransition, FO } from "@/components/cyan";
import { useAttemptStore } from "@/store/useAttemptStore";
import { GameHeader } from "./GameHeader";
import { livePositionFor } from "./ChallengeHeader";
import { StatusStrip } from "./StatusStrip";
import { PipelineStrip } from "./PipelineStrip";
import { SupplyChainAnimation } from "./SupplyChainAnimation";
import { DecisionPanel } from "./DecisionPanel";
import { LiveLeaderboard } from "./LiveLeaderboard";
import { TrendPanel } from "./TrendPanel";
import { RoundHistoryTable } from "./RoundHistoryTable";
import { RulesPanel } from "./RulesPanel";
import { PlayCoachOverlay } from "./PlayCoachOverlay";
import { PerformanceReportView } from "@/components/report/PerformanceReport";
import { migrateGameConfig } from "@/engine";

export function PlayScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);
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

  return (
    <GridBackground>
      <PageTransition>
        {/*
          Mobile/tablet: scrollable stack (content never crushed).
          lg+: viewport-locked single-screen densify (classic beer-game parity).
        */}
        <main
          className={[
            "max-w-[1288px] mx-auto px-3 sm:px-4 md:px-6 flex flex-col gap-3 sm:gap-4",
            "min-h-dvh",
            "lg:h-dvh lg:max-h-dvh lg:overflow-hidden",
            "overflow-x-clip overflow-y-auto lg:overflow-y-hidden",
            "pt-3 sm:pt-4",
            isRoundFlow
              ? "pb-[max(1rem,env(safe-area-inset-bottom))]"
              : "pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-[92px]",
          ].join(" ")}
          style={{ color: "var(--sv-text)" }}
        >
          <div className="shrink-0">
            <GameHeader
              attempt={attempt}
              livePosition={pos}
              heatAccessCode={heatAccessCode}
              onHowToPlayClick={() => setShowRules(true)}
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
            <div className="flex-1 min-h-0 lg:overflow-y-auto overflow-x-hidden">
              <SupplyChainAnimation
                record={lastRecord}
                attempt={attempt}
                leaderboard={leaderboard}
                isFinalRound={isFinalRound}
                onContinue={finishRoundSummary}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4 lg:overflow-hidden">
              <div className="shrink-0">
                <StatusStrip
                  opening={opening}
                  lastRecord={null}
                  inventoryCost={config.inventory_cost_per_unit}
                  backlogCost={config.backlog_cost_per_unit}
                  cumulativeCost={attempt.cumulative_cost}
                />
              </div>

              {/*
                Chart : Game progress = 1.5 : 1 on lg+ (flex 3 / 2).
                Mobile/tablet: fixed svh heights for reliable scroll layout.
              */}
              <div className="flex-1 min-h-0 flex flex-col gap-3 sm:gap-4">
                <div
                  className={[
                    "grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-3 sm:gap-4 min-h-0",
                    /* mobile: fixed band */
                    "shrink-0",
                    /* lg+: 1.5× the progress band */
                    "lg:shrink lg:flex-[3] lg:min-h-[200px]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "min-w-0 flex flex-col",
                      "h-[min(42svh,360px)] min-h-[220px]",
                      "sm:h-[min(38svh,380px)] sm:min-h-[240px]",
                      "lg:h-full lg:min-h-0",
                    ].join(" ")}
                  >
                    <TrendPanel rounds={attempt.rounds} dense />
                  </div>
                  <div
                    className={[
                      "min-w-0 flex flex-col",
                      "h-[min(32svh,220px)] min-h-[160px]",
                      "sm:h-[min(28svh,240px)] sm:min-h-[180px]",
                      "max-h-[260px]",
                      "lg:h-full lg:min-h-0 lg:max-h-none",
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

                <div
                  className={[
                    "grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-3 sm:gap-4 min-h-0",
                    "shrink-0",
                    /* lg+: base unit — chart is 1.5× this */
                    "lg:shrink lg:flex-[2] lg:min-h-[140px]",
                  ].join(" ")}
                >
                  <div className="min-h-0 min-w-0 flex flex-col h-[min(36svh,220px)] lg:h-full lg:min-h-0">
                    <RoundHistoryTable rounds={attempt.rounds} unit={unit} dense />
                  </div>
                  <div className="min-h-0 overflow-hidden lg:h-full">
                    <PipelineStrip
                      opening={opening}
                      delay={config.delivery_delay}
                      pipeline={attempt.pipeline}
                      supplyRate={opening?.supplyRate}
                      timelineUnit={unit}
                      compact
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
            disabled={submitting || phase !== "decide"}
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

        {/* Coach recommendations / alerts — fixed overlay, same speech design as onboarding */}
        {!isRoundFlow && (
          <PlayCoachOverlay
            attempt={attempt}
            phase={phase}
            lastRecord={lastRecord}
            completedRounds={completed}
          />
        )}

        {showRules && (
          <RulesPanel config={config} onClose={() => setShowRules(false)} />
        )}
      </PageTransition>
    </GridBackground>
  );
}
