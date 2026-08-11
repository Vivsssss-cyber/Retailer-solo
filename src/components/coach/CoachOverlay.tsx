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
 * Fixed overlay — sits above the place-order dock on mobile,
 * bottom-right on larger screens. Auto-fades after speaking.
 */
export function CoachOverlay({
  message,
  onDismiss,
  holdMs = 2200,
  fadeMs = 450,
}: CoachOverlayProps) {
  const messageId = message?.id ?? null;
  const [visible, setVisible] = useState(false);
  const [doneTyping, setDoneTyping] = useState(false);
  const [trackedId, setTrackedId] = useState<string | null>(messageId);

  // Sync enter/reset state when the message identity changes (render-time adjust).
  if (messageId !== trackedId) {
    setTrackedId(messageId);
    setDoneTyping(false);
    setVisible(false);
  }

  // Enter animation after a new message mounts (rAF = async, not sync-in-effect).
  useEffect(() => {
    if (!messageId) return;
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [messageId]);

  // After typewriter finishes → hold → fade → dismiss
  useEffect(() => {
    if (!doneTyping || !messageId) return;
    const hold = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => onDismiss(), fadeMs);
    }, holdMs);
    return () => window.clearTimeout(hold);
  }, [doneTyping, messageId, holdMs, fadeMs, onDismiss]);

  // Must stay above any early return — hooks order cannot change across renders.
  const handleDialogueComplete = useCallback(() => {
    setDoneTyping(true);
  }, []);

  if (!message) return null;

  return (
    <div
      className={[
        // A fixed coach obscures the compact chart stack on phones. The same
        // guidance remains available through the header's How to play control.
        "hidden sm:block fixed z-[60] pointer-events-none",
        // Clear the 2-row place-order dock + safe area on phones
        "left-2 right-2 bottom-[calc(11.25rem+env(safe-area-inset-bottom,0px))]",
        // Tablet+: float above dock, right-aligned
        "sm:left-auto sm:right-4 sm:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))]",
        "sm:w-[min(380px,calc(100vw-2rem))]",
        // Wide: a bit lower (dock is single-row pill)
        "lg:bottom-8 lg:right-6 lg:w-[min(400px,calc(100vw-3rem))]",
      ].join(" ")}
      role="status"
      aria-label={message.label ?? "Coach recommendation"}
      aria-live="polite"
    >
      <div
        className="pointer-events-auto w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
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
