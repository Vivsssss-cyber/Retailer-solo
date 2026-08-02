"use client";

import { FO } from "@/components/cyan";

export function RoundProgressBar({
  currentRound,
  totalRounds,
  completedRounds,
  unit = "Round",
  /** Compact strip for the frost nav bar */
  variant = "standalone",
}: {
  currentRound: number;
  totalRounds: number;
  completedRounds: number;
  unit?: string;
  variant?: "standalone" | "nav";
}) {
  const displayRound = Math.min(currentRound, totalRounds);
  const segments = Array.from({ length: totalRounds }, (_, i) => {
    const done = i < completedRounds;
    const active = i === completedRounds && completedRounds < totalRounds;
    return { done, active, index: i };
  });

  if (variant === "nav") {
    return (
      <div
        className="flex flex-col justify-center gap-1 min-w-0 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[340px]"
        role="progressbar"
        aria-valuenow={completedRounds}
        aria-valuemin={0}
        aria-valuemax={totalRounds}
        aria-label={`${unit} ${displayRound} of ${totalRounds}`}
      >
        <div className="flex items-center justify-between gap-2 leading-none">
          <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-sv-text-secondary truncate">
            {unit} progress
          </span>
          <span className="sv-tabular text-[11px] font-bold text-sv-ink shrink-0">
            {displayRound}
            <span className="text-sv-text-muted font-semibold"> / {totalRounds}</span>
          </span>
        </div>
        <div className="flex gap-0.5 sm:gap-1">
          {segments.map(({ done, active, index }) => (
            <div
              key={index}
              title={`${unit} ${index + 1}`}
              className="flex-1 min-w-0 h-1.5 rounded-full transition-[background,opacity] duration-200"
              style={{
                background: done
                  ? "var(--sv-teal-mid)"
                  : active
                    ? "var(--sv-cyan)"
                    : "var(--sv-border)",
                opacity: done || active ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span
          style={{
            fontFamily: FO,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Progress
        </span>
        <span
          className="sv-tabular"
          style={{ fontFamily: FO, fontSize: 12, fontWeight: 600, color: "var(--sv-ink)" }}
        >
          {unit} {displayRound} of {totalRounds}
          {completedRounds > 0 ? ` · ${completedRounds} done` : ""}
        </span>
      </div>
      <div className="flex gap-1">
        {segments.map(({ done, active, index }) => (
          <div
            key={index}
            title={`${unit} ${index + 1}`}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 9999,
              background: done
                ? "var(--sv-teal-mid)"
                : active
                  ? "var(--sv-cyan)"
                  : "var(--sv-border)",
              opacity: done || active ? 1 : 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}
