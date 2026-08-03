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
      className="fixed z-[60] bottom-[calc(7.25rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-5 sm:bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-8 lg:right-6 max-w-[min(420px,calc(100vw-24px))] sm:max-w-[min(420px,calc(100vw-40px))]"
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
