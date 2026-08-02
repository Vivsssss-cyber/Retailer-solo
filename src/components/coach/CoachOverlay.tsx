"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CoachSpeech, type CoachTone } from "./CoachSpeech";

export type CoachOverlayMessage = {
  id: string;
  text: string;
  tone: CoachTone;
  /** Short label above the bubble (e.g. "Round tip", "Alert"). */
  label?: string;
};

type CoachOverlayProps = {
  message: CoachOverlayMessage | null;
  onDismiss: () => void;
  /** Hold after typewriter finishes before fade starts (ms). Default 2200. */
  holdMs?: number;
  /** Fade duration (ms). Default 450. */
  fadeMs?: number;
};

/**
 * Fixed corner overlay — coach says recommendations / alerts,
 * then auto-fades after the line finishes (manual dismiss still works).
 */
export function CoachOverlay({
  message,
  onDismiss,
  holdMs = 2200,
  fadeMs = 450,
}: CoachOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);

  // Enter animation whenever a new message arrives
  useEffect(() => {
    if (!message) {
      setVisible(false);
      setDoneTyping(false);
      return;
    }
    setDoneTyping(false);
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [message?.id]);

  // After typewriter finishes → hold → fade → dismiss
  useEffect(() => {
    if (!doneTyping || !message) return;
    const hold = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => onDismiss(), fadeMs);
    }, holdMs);
    return () => window.clearTimeout(hold);
  }, [doneTyping, message, holdMs, fadeMs, onDismiss]);

  // Must stay above any early return — hooks order cannot change across renders.
  const handleDialogueComplete = useCallback(() => {
    setDoneTyping(true);
  }, []);

  if (!message) return null;

  return (
    <div
      className="fixed z-[60] bottom-20 right-3 sm:bottom-24 sm:right-5 lg:bottom-8 lg:right-6 max-w-[min(420px,calc(100vw-24px))]"
      role="status"
      aria-label={message.label ?? "Coach recommendation"}
      aria-live="polite"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="relative">
        <CoachSpeech
          line={message.text}
          messageKey={message.id}
          tone={message.tone}
          size="md"
          onDialogueComplete={handleDialogueComplete}
        />
      </div>
    </div>
  );
}
