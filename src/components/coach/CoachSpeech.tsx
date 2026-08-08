"use client";

import Image from "next/image";
import {
  coachExpressionForTone,
  coachSrc,
  type CoachExpression,
} from "@/lib/personas";
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
  /**
   * Explicit pose override. When omitted, derived from `tone`:
   * ok→celebrate · warn→thinking · danger→alert · tip→explain
   */
  expression?: CoachExpression;
  /** `md` = compact play overlay; `lg` = onboarding hero. */
  size?: "md" | "lg";
  className?: string;
  onDialogueComplete?: () => void;
};

/**
 * Coach + speech bubble as one unit.
 * Bubble sits at the coach's head (top-aligned), tail points into the face.
 * Overlay (md): horizontal — bubble left, coach right.
 * Onboarding (lg): stacked on xs, side-by-side from `sm`.
 * Pose swaps with tone (or `expression`) so the mascot matches the message.
 */
export function CoachSpeech({
  line,
  messageKey,
  tone = "tip",
  expression,
  size = "lg",
  className = "",
  onDialogueComplete,
}: CoachSpeechProps) {
  const borderColor = TONE_BORDER[tone];
  const isOverlay = size === "md";
  const pose = expression ?? coachExpressionForTone(tone);
  const avatarSrc = coachSrc(pose);

  // Mascot as accent — bubble is primary. Sizes at 1.2× prior scale for pose readability.
  // Full-body poses (alert/celebrate) need a bit more height so hands aren't clipped.
  const bustClass = isOverlay
    ? "h-[130px] w-auto object-contain object-bottom [image-rendering:pixelated] sm:h-[110px] lg:h-[125px]"
    : "h-[202px] w-auto object-contain object-bottom [image-rendering:pixelated] sm:h-[154px] lg:h-[178px]";

  const bubbleMax = isOverlay
    ? "max-w-none flex-1 min-w-0"
    : "w-full max-w-[min(280px,calc(100vw-5.5rem))] sm:max-w-[280px] lg:max-w-[240px]";

  // items-start = bubble at head; small top offset keeps bubble near face not above crown
  const shellClass = isOverlay
    ? "flex flex-row items-start justify-end gap-0 w-full"
    : "flex flex-col-reverse sm:flex-row items-center sm:items-start justify-center sm:justify-end gap-1 sm:gap-0";

  const headNudge = isOverlay
    ? "mt-2 sm:mt-1.5"
    : "sm:mt-3 lg:mt-4";

  return (
    <aside className={`${shellClass} ${className}`} aria-label="Coach">
      <div
        className={`relative z-10 ${bubbleMax} ${headNudge} ${
          isOverlay ? "-mr-0.5 sm:-mr-1" : "sm:-mr-1"
        }`}
        style={{
          background: "rgba(255, 255, 255, 0.96)",
          border: `1.5px solid ${borderColor}`,
          borderRadius: "var(--sv-radius-2xl)",
          padding: isOverlay ? "10px 12px" : "12px 14px",
          boxShadow: "var(--sv-shadow-2)",
        }}
      >
        <CoachDialogue
          key={`${messageKey}-${line}`}
          text={line}
          cps={36}
          compact={isOverlay}
          onComplete={onDialogueComplete}
        />

        {/* Tail → coach head (right, near top of bubble) */}
        <span
          aria-hidden
          className={isOverlay ? "block" : "hidden sm:block"}
          style={{
            position: "absolute",
            right: -10,
            top: isOverlay ? 16 : 18,
            width: 0,
            height: 0,
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: `10px solid ${borderColor}`,
          }}
        />
        <span
          aria-hidden
          className={isOverlay ? "block" : "hidden sm:block"}
          style={{
            position: "absolute",
            right: -8,
            top: isOverlay ? 17 : 19,
            width: 0,
            height: 0,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderLeft: "9px solid rgba(255, 255, 255, 0.96)",
          }}
        />

        {/* Tail → coach head from below (onboarding mobile stack: bubble under coach) */}
        {!isOverlay && (
          <>
            <span
              aria-hidden
              className="sm:hidden"
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
              className="sm:hidden"
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
          </>
        )}
      </div>

      <div
        className={`pointer-events-none shrink-0 transition-[opacity,transform] duration-200 ease-out ${
          isOverlay ? "-ml-0.5" : "sm:-ml-0.5"
        }`}
        aria-hidden
      >
        <Image
          key={pose}
          src={avatarSrc}
          alt=""
          width={1134}
          height={1403}
          priority={size === "lg"}
          unoptimized
          sizes={
            isOverlay
              ? "(max-width: 640px) 130px, 125px"
              : "(max-width: 640px) 202px, (max-width: 1024px) 154px, 178px"
          }
          className={bustClass}
        />
      </div>
    </aside>
  );
}
