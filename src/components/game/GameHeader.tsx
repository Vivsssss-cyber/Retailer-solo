"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { Info, Trophy } from "@/components/cyan/PixelIcons";
import { GameButton } from "@/components/cyan";
import {
  PERSONA_AVATAR_PLACEHOLDER,
  personaBySlug,
} from "@/lib/personas";
import {
  readPlayerProfile,
  subscribePlayerProfile,
} from "@/lib/playerProfile";
import { RoundProgressBar } from "./RoundProgressBar";
import type { Attempt } from "@/engine";

/** Hydration-safe identity from localStorage (server snapshot is empty). */
function usePlayerAvatarSrc(): string | null {
  const personaSlug = useSyncExternalStore(
    subscribePlayerProfile,
    () => readPlayerProfile().persona,
    () => null,
  );
  return personaBySlug(personaSlug)?.avatarSrc ?? null;
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
  const avatarSrc = usePlayerAvatarSrc();
  const config = attempt.configuration;
  const unit = config.timeline_unit || "Round";
  const totalRounds = config.total_rounds;
  const completedRounds = attempt.rounds.length;
  const currentRound = attempt.current_round;

  return (
    <header className="sticky top-0 z-50 pointer-events-none">
      <div className="w-full mx-auto pointer-events-auto">
        <div className="sv-frost-bar rounded-2xl flex flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:gap-3 px-2 sm:px-3 py-2 w-full border border-white isolate min-h-[52px] sm:min-h-[56px]">
          {/* Left: brand + operator */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pl-0.5">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-sv-lg flex items-center justify-center shrink-0">
                <Image
                  src="/cyan-logo.svg"
                  alt="CYAN"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
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

            {/* Avatar + display name only — no persona tag (Scout, Analyst, …) */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 px-0.5 sm:px-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center overflow-visible">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc || PERSONA_AVATAR_PLACEHOLDER}
                  alt=""
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain [image-rendering:pixelated]"
                  style={{ background: "transparent" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PERSONA_AVATAR_PLACEHOLDER;
                  }}
                />
              </div>
              <span className="hidden sm:block text-[13px] font-bold text-sv-ink truncate max-w-[72px] sm:max-w-[120px] leading-tight">
                {attempt.player_name}
              </span>
            </div>
          </div>

          {/* Right: help + metrics — sit with brand row on mobile */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 order-2 sm:order-3">
            <GameButton
              onClick={onHowToPlayClick}
              size="sm"
              variant="secondary"
              className="hidden md:inline-flex items-center gap-1.5 px-3 bg-white/60 min-h-9"
              aria-label="How to play"
            >
              <Info size={14} />
              <span>How to play</span>
            </GameButton>
            <GameButton
              onClick={onHowToPlayClick}
              size="sm"
              variant="secondary"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 p-0 bg-white/60"
              aria-label="How to play"
            >
              <Info size={14} />
            </GameButton>

            <span
              className="hidden sm:block w-px h-7 bg-sv-border/70 shrink-0 mx-0.5"
              aria-hidden
            />

            <div className="flex items-center gap-1 sm:gap-2">
              {heatAccessCode && !heatAccessCode.startsWith("SOLO-") && (
                <MetricPill
                  label="Heat"
                  value={heatAccessCode}
                  accent
                  className="hidden sm:flex"
                />
              )}
              {livePosition != null && (
                <MetricPill
                  label="Position"
                  value={`#${livePosition}`}
                  icon={<Trophy size={12} color="var(--sv-teal-mid)" />}
                  accent
                  className="hidden sm:flex"
                />
              )}
            </div>
          </div>

          {/* Progress — full width under brand row on phones; centered on larger */}
          <div className="w-full sm:w-auto sm:flex-1 flex justify-center min-w-0 px-0 sm:px-2 order-3 sm:order-2 basis-full sm:basis-auto">
            <RoundProgressBar
              variant="nav"
              currentRound={currentRound}
              totalRounds={totalRounds}
              completedRounds={completedRounds}
              unit={unit}
            />
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
  icon,
  className = "",
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sv-surface flex flex-col gap-0.5 items-end justify-center rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 min-w-[52px] sm:min-w-[76px] ${className}`}
      style={{
        background: "rgba(255,255,255,0.55)",
        border: "1px solid color-mix(in srgb, var(--sv-border) 70%, white)",
      }}
    >
      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.06em] text-sv-text-secondary leading-none">
        {label}
      </span>
      <span
        className={`inline-flex items-center gap-1 text-[11px] sm:text-[13px] font-bold leading-tight sv-tabular ${
          accent ? "text-sv-teal-mid" : "text-sv-ink"
        }`}
      >
        {icon}
        <span key={value} className="sv-value-tick">
          {value}
        </span>
      </span>
    </div>
  );
}
