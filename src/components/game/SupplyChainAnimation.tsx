"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FO, GameButton, cardStyle } from "@/components/cyan";
import {
  CheckCircle2,
  Package,
  TrendingUp,
  Trophy,
} from "@/components/cyan/PixelIcons";
import StatusView from "@/components/game/StatusView";
import { readPlayerAvatarSrc } from "@/lib/playerProfile";
import type { Attempt, LeaderboardRow, RoundRecord } from "@/engine";
import { livePositionFor } from "./ChallengeHeader";

function usePlayerAvatar(): string | null {
  return useSyncExternalStore(
    () => () => {},
    readPlayerAvatarSrc,
    () => null,
  );
}

/** Strong ease-out — starts quick, settles soft (Emil). */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    // Full transform string = hardware-accelerated path in motion
    transform: "translateY(12px)",
  },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: {
      duration: 0.42,
      ease: EASE_OUT,
    },
  },
};

/**
 * Post-submit screen: supply-chain rail + round KPIs + continue.
 * Kept deliberately flat — no hero ribbon, no decision banner.
 */
export function SupplyChainAnimation({
  record,
  attempt,
  leaderboard,
  onContinue,
  isFinalRound,
}: {
  record: RoundRecord;
  attempt: Attempt;
  leaderboard: LeaderboardRow[];
  onContinue: () => void;
  isFinalRound: boolean;
}) {
  const reduce = useReducedMotion();
  const playerAvatar = usePlayerAvatar();
  const config = attempt.configuration;
  const unit = config.timeline_unit || "Round";
  const pos = livePositionFor(leaderboard, attempt.player_name);
  const backlog = record.ending_backlog;
  const fulfilled = record.fulfilled_backlog + record.fulfilled_current_demand;

  const statusData = {
    title: "Supply Chain Overview",
    stages: ["Wholesaler", "Retailer", "Customer"],
    currentStage: "Retailer",
    incomingAmount: record.incoming_delivery,
    originalOrderAmount: record.scheduled_order,
    orderAmount: record.placed_order,
    outgoingAmount: fulfilled,
    incomingDemand: record.customer_demand + record.opening_backlog,
  };

  if (reduce) {
    return (
      <SummaryLayout
        unit={unit}
        record={record}
        attempt={attempt}
        config={config}
        statusData={statusData}
        backlog={backlog}
        fulfilled={fulfilled}
        pos={pos}
        leaderboard={leaderboard}
        isFinalRound={isFinalRound}
        onContinue={onContinue}
        playerAvatar={playerAvatar}
      />
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-3 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <SummaryLayout
        unit={unit}
        record={record}
        attempt={attempt}
        config={config}
        statusData={statusData}
        backlog={backlog}
        fulfilled={fulfilled}
        pos={pos}
        leaderboard={leaderboard}
        isFinalRound={isFinalRound}
        onContinue={onContinue}
        playerAvatar={playerAvatar}
        animated
      />
    </motion.div>
  );
}

function SummaryLayout({
  unit,
  record,
  attempt,
  config,
  statusData,
  backlog,
  fulfilled,
  pos,
  leaderboard,
  isFinalRound,
  onContinue,
  playerAvatar,
  animated,
}: {
  unit: string;
  record: RoundRecord;
  attempt: Attempt;
  config: Attempt["configuration"];
  statusData: {
    title: string;
    stages: string[];
    currentStage: string;
    incomingAmount: number;
    originalOrderAmount: number;
    orderAmount: number;
    outgoingAmount: number;
    incomingDemand: number;
  };
  backlog: number;
  fulfilled: number;
  pos: number | null | undefined;
  leaderboard: LeaderboardRow[];
  isFinalRound: boolean;
  onContinue: () => void;
  playerAvatar?: string | null;
  animated?: boolean;
}) {
  const Wrap = animated ? motion.div : "div";
  const wrapProps = animated ? { variants: itemVariants } : {};

  return (
    <>
      <Wrap className="flex flex-col gap-1" {...wrapProps}>
        <h1
          style={{
            fontFamily: FO,
            fontWeight: 800,
            fontSize: 22,
            color: "var(--sv-ink)",
            letterSpacing: "-0.3px",
            lineHeight: 1.2,
          }}
        >
          {unit} {record.round} Summary
        </h1>
        <p
          style={{
            fontFamily: FO,
            fontSize: 13,
            color: "var(--sv-text-secondary)",
            lineHeight: 1.45,
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--sv-ink)" }}>
            {attempt.player_name}
          </span>
          {" · "}
          Ordered{" "}
          <span
            className="sv-tabular"
            style={{ fontWeight: 700, color: "var(--sv-ink)" }}
          >
            {record.placed_order}
          </span>
          {" · "}
          Demand{" "}
          <span
            className="sv-tabular"
            style={{ fontWeight: 700, color: "var(--sv-ink)" }}
          >
            {record.customer_demand}
          </span>
          {" · "}
          Delay {config.delivery_delay} {unit.toLowerCase()}
          {config.delivery_delay === 1 ? "" : "s"}
        </p>
      </Wrap>

      <Wrap {...wrapProps}>
        <StatusView
          data={statusData}
          showSimulation
          playerAvatarSrc={playerAvatar}
          playerName={attempt.player_name}
        />
      </Wrap>

      <Wrap
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        {...(animated
          ? {
              variants: {
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.05, delayChildren: 0 },
                },
              },
            }
          : {})}
      >
        <KpiCard
          animated={animated}
          icon={<Package size={16} color="var(--sv-teal-mid)" />}
          title="Delivery"
          value={`${record.incoming_delivery}/${record.scheduled_order}`}
          hint="In / scheduled"
        />
        <KpiCard
          animated={animated}
          icon={<Package size={16} color="var(--sv-teal-mid)" />}
          title="Inventory"
          value={String(record.ending_inventory)}
          hint="Closing stock"
          valueColor={
            record.ending_inventory === 0 ? "var(--sv-warning)" : undefined
          }
        />
        <KpiCard
          animated={animated}
          icon={
            <TrendingUp
              size={16}
              color={backlog > 0 ? "var(--sv-negative)" : "var(--sv-positive)"}
            />
          }
          title="Backlog"
          value={String(backlog)}
          hint="Unfulfilled"
          valueColor={backlog > 0 ? "var(--sv-negative)" : "var(--sv-positive)"}
        />
        <KpiCard
          animated={animated}
          icon={<CheckCircle2 size={16} color="var(--sv-teal-mid)" />}
          title="Cost"
          value={`$${record.cumulative_cost.toLocaleString()}`}
          hint={`+$${record.round_cost.toLocaleString()} this ${unit.toLowerCase()}`}
        />
      </Wrap>

      <Wrap
        style={{
          ...cardStyle,
          padding: 14,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
        {...wrapProps}
      >
        {pos != null ? (
          <div className="flex items-center gap-2.5">
            <Trophy size={16} color="var(--sv-teal-mid)" />
            <p
              style={{
                fontFamily: FO,
                fontSize: 13,
                color: "var(--sv-text-secondary)",
              }}
            >
              Live heat{" "}
              <span
                className="sv-tabular"
                style={{
                  fontWeight: 800,
                  color: "var(--sv-teal-mid)",
                  fontSize: 15,
                }}
              >
                #{pos}
              </span>
              <span style={{ color: "var(--sv-text-secondary)" }}>
                {" "}
                of {leaderboard.length || 1}
              </span>
            </p>
          </div>
        ) : (
          <p
            style={{
              fontFamily: FO,
              fontSize: 13,
              color: "var(--sv-text-secondary)",
            }}
          >
            Fulfilled {fulfilled} · order {record.placed_order} upstream
          </p>
        )}
        <GameButton type="button" onClick={onContinue} size="lg">
          {isFinalRound
            ? "View final report"
            : `Continue to next ${unit.toLowerCase()}`}
        </GameButton>
      </Wrap>
    </>
  );
}

function KpiCard({
  icon,
  title,
  value,
  hint,
  valueColor,
  animated,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  hint: string;
  valueColor?: string;
  animated?: boolean;
}) {
  const inner = (
    <div style={{ ...cardStyle, padding: 12, height: "100%" }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span
          style={{
            fontFamily: FO,
            fontWeight: 600,
            fontSize: 11,
            color: "var(--sv-text-secondary)",
          }}
        >
          {title}
        </span>
      </div>
      <p
        className="sv-tabular"
        style={{
          fontFamily: FO,
          fontWeight: 800,
          fontSize: 20,
          color: valueColor ?? "var(--sv-ink)",
          lineHeight: 1.15,
          letterSpacing: "-0.3px",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: FO,
          fontSize: 11,
          color: "var(--sv-text-secondary)",
          marginTop: 2,
        }}
      >
        {hint}
      </p>
    </div>
  );

  if (!animated) return inner;

  return <motion.div variants={itemVariants}>{inner}</motion.div>;
}
