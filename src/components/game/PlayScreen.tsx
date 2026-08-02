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
        <main className="max-w-[1288px] mx-auto px-6 py-16" style={{ fontFamily: FO }}>
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
          <main className="max-w-[1288px] mx-auto px-6 py-6">
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

  const config = attempt.configuration;
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
        {/* Viewport-locked play shell: prefer one screen on laptop/desktop */}
        <main
          className="max-w-[1288px] mx-auto px-3 sm:px-4 flex flex-col gap-2"
          style={{
            height: "100dvh",
            maxHeight: "100dvh",
            overflow: "hidden",
            color: "var(--sv-text)",
            paddingTop: 10,
            /* Clear fixed order dock */
            paddingBottom: isRoundFlow ? 16 : 92,
          }}
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
            <div className="flex-1 min-h-0 overflow-auto">
              <SupplyChainAnimation
                record={lastRecord}
                attempt={attempt}
                leaderboard={leaderboard}
                isFinalRound={isFinalRound}
                onContinue={finishRoundSummary}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
              <div className="shrink-0">
                <StatusStrip
                  opening={opening}
                  lastRecord={null}
                  inventoryCost={config.inventory_cost_per_unit}
                  backlogCost={config.backlog_cost_per_unit}
                  cumulativeCost={attempt.cumulative_cost}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-2 flex-1 min-h-0">
                <div className="min-h-0 h-full">
                  <TrendPanel rounds={attempt.rounds} dense />
                </div>
                <div className="min-h-0 h-full">
                  <LiveLeaderboard
                    live={leaderboard}
                    global={globalBoard}
                    playerName={attempt.player_name}
                    dense
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-2 shrink-0 max-h-[38%] min-h-0">
                <div className="min-h-0 min-w-0 overflow-hidden">
                  <RoundHistoryTable rounds={attempt.rounds} unit={unit} dense />
                </div>
                <div className="min-h-0 overflow-hidden">
                  <PipelineStrip
                    opening={opening}
                    delay={config.delivery_delay}
                    pipeline={attempt.pipeline}
                    pendingOrder={orderInput}
                    supplyRate={opening?.supplyRate}
                    timelineUnit={unit}
                    compact
                  />
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
