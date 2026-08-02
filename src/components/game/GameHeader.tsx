"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { Info } from "@/components/cyan/PixelIcons";
import { GameButton } from "@/components/cyan";
import {
  PERSONA_AVATAR_PLACEHOLDER,
  personaBySlug,
} from "@/lib/personas";
import { readPlayerProfile } from "@/lib/playerProfile";
import { RoundProgressBar } from "./RoundProgressBar";
import type { Attempt } from "@/engine";

/** Hydration-safe identity from localStorage (server snapshot is empty). */
function usePlayerIdentity(): {
  avatarSrc: string | null;
  personaName: string | null;
} {
  const personaSlug = useSyncExternalStore(
    () => () => {},
    () => readPlayerProfile().persona,
    () => null,
  );
  const persona = personaBySlug(personaSlug);
  return {
    avatarSrc: persona?.avatarSrc ?? null,
    personaName: persona?.name ?? null,
  };
}

export function GameHeader({
  attempt,
  livePosition,
  heatAccessCode,
  onHowToPlayClick,
}: {
  attempt: Attempt;
  livePosition: number | null;
  /** Multiplayer heat code — shown so host can re-share mid-game. */
  heatAccessCode?: string | null;
  onHowToPlayClick?: () => void;
}) {
  const { avatarSrc, personaName } = usePlayerIdentity();
  const costStr = attempt.cumulative_cost.toLocaleString();
  const config = attempt.configuration;
  const unit = config.timeline_unit || "Round";
  const totalRounds = config.total_rounds;
  const completedRounds = attempt.rounds.length;
  const currentRound = attempt.current_round;

  return (
    <header className="sticky top-0 z-50 pointer-events-none">
      <div className="w-full mx-auto pointer-events-auto">
        <div className="sv-frost-bar rounded-2xl flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 w-full border border-white isolate min-h-[56px]">
          {/* Left: brand + operator */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0">
            <div className="flex items-center gap-2 shrink-0 pl-0.5">
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-sv-lg flex items-center justify-center shrink-0">
                <Image
                  src="/cyan-logo.svg"
                  alt="CYAN"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain"
                />
              </span>
              <span className="hidden lg:flex flex-col justify-center leading-none">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-sv-teal-mid">
                  CYAN
                </span>
                <span className="text-[14px] font-bold text-sv-ink tracking-tight mt-0.5">
                  Retailer Challenge
                </span>
              </span>
            </div>

            <span
              className="hidden sm:block w-px h-7 bg-sv-border/70 shrink-0"
              aria-hidden
            />

            {/* Operator — avatar sits free, no plate behind the character */}
            <div className="flex items-center gap-2 min-w-0 px-0.5 sm:px-1">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center overflow-visible">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc || PERSONA_AVATAR_PLACEHOLDER}
                  alt=""
                  className="w-10 h-10 object-contain [image-rendering:pixelated]"
                  style={{ background: "transparent" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PERSONA_AVATAR_PLACEHOLDER;
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-sv-text-secondary leading-none">
                  {personaName || "Operator"}
                </span>
                <span className="text-[13px] font-bold text-sv-ink truncate max-w-[72px] sm:max-w-[120px] leading-tight">
                  {attempt.player_name}
                </span>
              </div>
            </div>
          </div>

          {/* Center: round progress */}
          <div className="flex-1 flex justify-center min-w-0 px-1 sm:px-2">
            <RoundProgressBar
              variant="nav"
              currentRound={currentRound}
              totalRounds={totalRounds}
              completedRounds={completedRounds}
              unit={unit}
            />
          </div>

          {/* Right: help + metrics */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <GameButton
              onClick={onHowToPlayClick}
              size="sm"
              variant="secondary"
              className="hidden md:inline-flex items-center gap-1.5 px-3 bg-white/60"
              aria-label="How to play"
            >
              <Info size={14} />
              <span>How to play</span>
            </GameButton>
            <GameButton
              onClick={onHowToPlayClick}
              size="sm"
              variant="secondary"
              className="md:hidden inline-flex items-center justify-center w-9 h-9 p-0 bg-white/60"
              aria-label="How to play"
            >
              <Info size={14} />
            </GameButton>

            <span
              className="hidden sm:block w-px h-7 bg-sv-border/70 shrink-0 mx-0.5"
              aria-hidden
            />

            <div className="flex items-center gap-1.5 sm:gap-2">
              {heatAccessCode && !heatAccessCode.startsWith("SOLO-") && (
                <MetricPill label="Heat code" value={heatAccessCode} accent />
              )}
              <MetricPill label="Cum. cost" value={`$${costStr}`} accent />
              {livePosition != null && (
                <MetricPill label="Live pos" value={`#${livePosition}`} />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetricPill({
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
      className="flex flex-col gap-0.5 items-end justify-center rounded-xl px-2 sm:px-2.5 py-1.5 min-w-[64px] sm:min-w-[76px]"
      style={{
        background: "rgba(255,255,255,0.55)",
        border: "1px solid color-mix(in srgb, var(--sv-border) 70%, white)",
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-sv-text-secondary leading-none">
        {label}
      </span>
      <span
        className={`text-[12px] sm:text-[13px] font-bold leading-tight sv-tabular ${
          accent ? "text-sv-teal-mid" : "text-sv-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
