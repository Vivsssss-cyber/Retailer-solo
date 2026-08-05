"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { FO, GameButton } from "@/components/cyan";
import { CoachSpeech } from "@/components/coach";
import {
  getPlayTourSteps,
  markPlayTourDone,
  type PlayTourStep,
} from "@/lib/playTour";
import type { GameConfig } from "@/engine";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 10;
/** Dark neutral dim — not teal-tinted. */
const OVERLAY = "rgba(20, 24, 28, 0.72)";
const HOLE_BORDER = "rgba(255, 255, 255, 0.88)";

function measureTarget(target: string | null): Rect | null {
  if (!target || typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

/**
 * Focused-state onboarding: dark overlay + spotlight hole on real play UI.
 * Coach teaches each piece. Manual Next / Skip — does not auto-fade.
 */
export function PlayTour({
  config,
  onComplete,
  /** When reopened from How to play or onboarding (not first warehouse open). */
  replay = false,
  /** Override last-step CTA (default: Open warehouse / Got it). */
  finishLabel,
}: {
  config: GameConfig;
  onComplete: () => void;
  replay?: boolean;
  finishLabel?: string;
}) {
  const steps = getPlayTourSteps(config);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step: PlayTourStep = steps[index] ?? steps[steps.length - 1];
  const isLast = index >= steps.length - 1;

  const finish = useCallback(() => {
    markPlayTourDone();
    onComplete();
  }, [onComplete]);

  const stepTarget = step.target;

  const remeasure = useCallback(() => {
    if (stepTarget) {
      const el = document.querySelector(`[data-tour="${stepTarget}"]`);
      el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
    requestAnimationFrame(() => {
      setRect(measureTarget(stepTarget));
    });
  }, [stepTarget]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure, index]);

  useEffect(() => {
    const onResize = () => remeasure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [remeasure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        if (isLast) finish();
        else setIndex((i) => Math.min(i + 1, steps.length - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, isLast, steps.length]);

  useEffect(() => {
    document.getElementById("play-tour-next")?.focus();
  }, [index]);

  // Lock body scroll while tour is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goNext = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const hole = rect;

  return (
    <div
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-tour-label"
      aria-describedby="play-tour-desc"
    >
      {/* Full-screen dark neutral dim — cut spotlight with box-shadow on the hole */}
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[91] rounded-2xl"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow: `0 0 0 9999px ${OVERLAY}`,
            border: `2px solid ${HOLE_BORDER}`,
            borderRadius: 16,
            boxSizing: "border-box",
            transition:
              "top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease",
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-auto fixed inset-0 z-[91]"
          style={{ background: OVERLAY }}
        />
      )}

      {/* Block clicks on the rest of the app (hole stays visual-only) */}
      <div className="pointer-events-auto fixed inset-0 z-[92]" aria-hidden />

      {/* Coach + controls — above dim */}
      <div
        className={[
          "pointer-events-auto fixed z-[95] flex flex-col gap-2",
          "left-2 right-2",
          step.target === "order"
            ? "bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(7rem+env(safe-area-inset-bottom,0px))]"
            : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-6",
          "sm:left-auto sm:right-4 sm:w-[min(400px,calc(100vw-2rem))]",
          "lg:right-6",
        ].join(" ")}
      >
        <p id="play-tour-label" className="sr-only">
          {step.label}
        </p>
        <div id="play-tour-desc">
          <CoachSpeech
            line={step.text}
            messageKey={step.id}
            tone={step.tone}
            size="md"
          />
        </div>

        <div
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.98)",
            border: "1.4px solid var(--sv-border)",
            boxShadow: "var(--sv-shadow-2)",
          }}
        >
          <span
            style={{
              fontFamily: FO,
              fontSize: 11,
              fontWeight: 700,
              color: "var(--sv-text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {index + 1} / {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <GameButton type="button" variant="ghost" size="sm" onClick={finish}>
              Skip
            </GameButton>
            <GameButton
              id="play-tour-next"
              type="button"
              size="sm"
              onClick={goNext}
            >
              {isLast
                ? finishLabel ??
                  (replay ? "Got it" : "Open warehouse")
                : "Next"}
            </GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}
