"use client";

import Image from "next/image";
import { FO, cardStyle } from "@/components/cyan";
import type { Attempt, LeaderboardRow } from "@/engine";

export function ChallengeHeader({
  attempt,
  livePosition,
}: {
  attempt: Attempt;
  livePosition: number | null;
}) {
  const config = attempt.configuration;
  const unit = config.timeline_unit || "Round";
  const displayRound = Math.min(attempt.current_round, config.total_rounds);

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3"
      style={{ ...cardStyle, padding: "12px 16px" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/cyan-logo.svg"
          alt="CYAN"
          width={40}
          height={40}
          className="shrink-0 object-contain"
          unoptimized
        />
        {config.partner_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.partner_logo}
            alt="Partner"
            style={{ height: 36, width: "auto", objectFit: "contain" }}
          />
        ) : null}
        <div className="min-w-0">
          <div
            style={{
              fontFamily: FO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--sv-teal-mid)",
            }}
          >
            CYAN Innovations
          </div>
          <h1
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: 17,
              color: "var(--sv-ink)",
              letterSpacing: "-0.3px",
              marginTop: 2,
              lineHeight: 1.25,
            }}
          >
            {config.game_name}
          </h1>
          <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-secondary)", marginTop: 2 }}>
            {attempt.player_name} · Retailer
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MetricChip
          label={unit}
          value={`${displayRound} / ${config.total_rounds}`}
        />
        <MetricChip
          label="Live pos"
          value={livePosition != null ? `#${livePosition}` : "—"}
        />
        <MetricChip
          label="Cum. cost"
          value={`$${attempt.cumulative_cost.toLocaleString()}`}
          accent
        />
      </div>
    </header>
  );
}

function MetricChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.55)",
        border: "1.4px solid white",
        borderRadius: 12,
        padding: "8px 12px",
        minWidth: 88,
      }}
    >
      <div
        style={{
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--sv-text-muted)",
        }}
      >
        {label}
      </div>
      <div
        className="sv-tabular"
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 16,
          color: accent ? "var(--sv-teal-mid)" : "var(--sv-ink)",
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function livePositionFor(
  board: LeaderboardRow[],
  playerName: string,
): number | null {
  return board.find((r) => r.player_name === playerName)?.position ?? null;
}
