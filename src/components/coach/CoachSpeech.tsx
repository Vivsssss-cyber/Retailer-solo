"use client";

import Image from "next/image";
import { COACH_AVATAR_SRC } from "@/lib/personas";
import { CoachDialogue } from "./CoachDialogue";

export type CoachTone = "ok" | "warn" | "danger" | "tip";

const TONE_BORDER: Record<CoachTone, string> = {
  ok: "var(--sv-positive)",
  warn: "var(--sv-warning)",
  danger: "var(--sv-negative)",
  tip: "var(--sv-teal-mid)",
};

type CoachSpeechProps = {
  line: string;
  /** Remounts typewriter when message identity changes. */
  messageKey: string;
  tone?: CoachTone;
  /** Smaller bust for fixed overlays. */
  size?: "md" | "lg";
  className?: string;
  onDialogueComplete?: () => void;
};

/**
 * Coach + speech bubble as one unit.
 * Desktop: bubble left of coach, tail points right into the bust.
 * Mobile: coach above, bubble below with tail pointing up.
 */
export function CoachSpeech({
  line,
  messageKey,
  tone = "tip",
  size = "lg",
  className = "",
  onDialogueComplete,
}: CoachSpeechProps) {
  const borderColor = TONE_BORDER[tone];
  const bustClass =
    size === "lg"
      ? "h-[150px] w-auto object-contain [image-rendering:pixelated] sm:h-[180px] lg:h-[260px]"
      : "h-[120px] w-auto object-contain [image-rendering:pixelated] sm:h-[140px] lg:h-[180px]";

  return (
    <aside
      className={`flex flex-col-reverse lg:flex-row items-center lg:items-end justify-center lg:justify-end ${className}`}
      aria-label="Coach"
    >
      <div
        className={`relative z-10 w-full ${
          size === "lg"
            ? "max-w-[260px] sm:max-w-[280px] lg:max-w-[240px] lg:mb-[72px]"
            : "max-w-[240px] sm:max-w-[260px] lg:max-w-[220px] lg:mb-[48px]"
        } lg:-mr-1`}
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          border: `1.5px solid ${borderColor}`,
          borderRadius: 16,
          padding: "14px 16px",
          boxShadow: "var(--sv-shadow-2)",
        }}
      >
        <CoachDialogue
          key={`${messageKey}-${line}`}
          text={line}
          cps={36}
          onComplete={onDialogueComplete}
        />

        {/* Tail → coach (desktop: right) */}
        <span
          aria-hidden
          className="hidden lg:block"
          style={{
            position: "absolute",
            right: -10,
            bottom: 28,
            width: 0,
            height: 0,
            borderTop: "9px solid transparent",
            borderBottom: "9px solid transparent",
            borderLeft: `11px solid ${borderColor}`,
          }}
        />
        <span
          aria-hidden
          className="hidden lg:block"
          style={{
            position: "absolute",
            right: -8,
            bottom: 29,
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: "10px solid rgba(255, 255, 255, 0.96)",
          }}
        />

        {/* Tail → coach (mobile: top) */}
        <span
          aria-hidden
          className="lg:hidden"
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            marginLeft: -9,
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderBottom: `11px solid ${borderColor}`,
          }}
        />
        <span
          aria-hidden
          className="lg:hidden"
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            marginLeft: -8,
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "10px solid rgba(255, 255, 255, 0.96)",
          }}
        />
      </div>

      <div className="pointer-events-none shrink-0 -mb-1 lg:mb-0" aria-hidden>
        <Image
          src={COACH_AVATAR_SRC}
          alt=""
          width={1122}
          height={1402}
          priority={size === "lg"}
          unoptimized
          sizes={size === "lg" ? "(max-width: 1024px) 150px, 220px" : "140px"}
          className={bustClass}
        />
      </div>
    </aside>
  );
}
