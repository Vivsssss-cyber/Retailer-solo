"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FO } from "@/components/cyan";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const dialogueTextStyle: React.CSSProperties = {
  fontFamily: FO,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  color: "var(--sv-ink)",
  margin: 0,
};

/**
 * RPG-style typewriter. Reserves full-line height so typing never shifts layout.
 */
export function CoachDialogue({
  text,
  cps = 36,
  onComplete,
}: {
  text: string;
  cps?: number;
  /** Fires once when typing finishes (or is skipped / reduced-motion). */
  onComplete?: () => void;
}) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    setCount(text.length);
    setDone(true);
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [text.length, onComplete]);

  useEffect(() => {
    setCount(0);
    setDone(false);
    completedRef.current = false;

    if (!text || prefersReducedMotion()) {
      setCount(text.length);
      setDone(true);
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const intervalMs = Math.max(12, Math.round(1000 / cps));
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= text.length) {
        window.clearInterval(id);
        setCount(text.length);
        setDone(true);
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        return;
      }
      setCount(i);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [text, cps, onComplete]);

  const displayed = text.slice(0, count);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!done) finish();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !done) {
          e.preventDefault();
          finish();
        }
      }}
      aria-label={done ? "Coach briefing" : "Skip typing"}
      style={{ cursor: done ? "default" : "pointer", userSelect: "none", position: "relative" }}
    >
      <p style={{ ...dialogueTextStyle, visibility: "hidden" }} aria-hidden>
        {text}
      </p>
      <p
        aria-live="polite"
        style={{
          ...dialogueTextStyle,
          position: "absolute",
          inset: 0,
        }}
      >
        {displayed}
        {!done && (
          <span
            className="sv-dialogue-caret"
            aria-hidden
            style={{
              display: "inline-block",
              marginLeft: 2,
              height: "1em",
              width: "0.55ch",
              background: "var(--sv-teal-mid)",
              verticalAlign: "baseline",
              transform: "translateY(0.1em)",
            }}
          />
        )}
      </p>
    </div>
  );
}
