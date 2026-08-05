"use client";

import type { CSSProperties } from "react";
import { FO, GameButton } from "@/components/cyan";
import { Package } from "@/components/cyan/PixelIcons";
import { expectedArrivalRound } from "@/engine";

export function DecisionPanel({
  value,
  onChange,
  onConfirm,
  disabled,
  currentRound,
  deliveryDelay,
  totalRounds,
  maxOrder,
  timelineUnit = "Round",
}: {
  value: number;
  onChange: (n: number) => void;
  onConfirm: () => void;
  disabled?: boolean;
  currentRound: number;
  deliveryDelay: number;
  totalRounds: number;
  maxOrder: number;
  lastDemand?: number;
  backlog?: number;
  inventory?: number;
  timelineUnit?: string;
}) {
  const arrival = expectedArrivalRound(currentRound, deliveryDelay);
  const arrivesAfterEnd = arrival > totalRounds;
  const unitLower = timelineUnit.toLowerCase();
  const delayLabel =
    deliveryDelay === 1
      ? `1 ${unitLower}`
      : `${deliveryDelay} ${unitLower}${unitLower.endsWith("s") ? "" : "s"}`;

  const arrivalCopy = arrivesAfterEnd
    ? "Arrives after the game ends — no effect"
    : `Arrives in ${delayLabel} (${timelineUnit} ${arrival})`;

  // Grow input with digits (1–5); size for current value, min 2 for single-digit comfort
  const maxDigits = Math.min(5, Math.max(1, String(Math.floor(Math.max(0, maxOrder))).length));
  const valueDigits = String(Math.floor(Math.abs(value)) || 0).length;
  const digitSlots = Math.min(maxDigits, Math.max(2, valueDigits));
  const inputWidth = `calc(${digitSlots}ch + 10px)`;

  const stepperShell: CSSProperties = {
    background: "rgba(255,255,255,0.88)",
    border: "1.4px solid var(--sv-border)",
    borderRadius: "var(--sv-radius-pill)",
    padding: "3px 4px",
    height: 48,
    minHeight: 48,
    overflow: "hidden",
  };

  return (
    <div
      role="region"
      aria-label="Place order"
      data-tour="order"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 w-[min(720px,calc(100vw-1rem))] sm:w-[min(740px,calc(100vw-1.5rem))] pointer-events-none"
    >
      <div
        className="sv-frost-dock pointer-events-auto flex flex-col gap-2.5 rounded-[var(--sv-radius-2xl)] p-3 sm:flex-row sm:items-center sm:gap-3 sm:rounded-[var(--sv-radius-pill)] sm:py-2.5 sm:pr-2.5 sm:pl-3.5"
        style={{
          border: "1.5px solid var(--sv-border)",
          backdropFilter: "blur(56px) saturate(1.55)",
          WebkitBackdropFilter: "blur(56px) saturate(1.55)",
        }}
      >
        {/* Header: title + round left, arrival right (mobile + desktop) */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "var(--sv-cyan-tint)",
              border: "1px solid var(--sv-border)",
            }}
            aria-hidden
          >
            <Package size={16} color="var(--sv-teal-mid)" />
          </div>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-2 sm:items-center sm:gap-3">
            <div className="min-w-0 shrink">
              <div
                style={{
                  fontFamily: FO,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--sv-ink)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                Place order
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontFamily: FO,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--sv-text-secondary)",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                }}
              >
                {timelineUnit} {currentRound}
                <span style={{ color: "var(--sv-text-muted)", fontWeight: 500 }}>
                  {" "}
                  of {totalRounds}
                </span>
              </div>
            </div>

            <p
              className="max-w-[52%] shrink-0 text-right sm:max-w-none sm:whitespace-nowrap"
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: 600,
                color: arrivesAfterEnd ? "var(--sv-warning)" : "var(--sv-text-secondary)",
                lineHeight: 1.3,
                margin: 0,
                paddingTop: 2,
              }}
            >
              {arrivalCopy}
            </p>
          </div>
        </div>

        {/* Controls: pill stepper + confirm */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <div
            className="flex flex-1 items-center justify-center gap-0.5 sm:flex-initial"
            style={stepperShell}
          >
            <button
              type="button"
              aria-label="Decrease order"
              disabled={disabled || value <= 0}
              onClick={() => onChange(Math.max(0, value - 1))}
              className="sv-press flex h-11 w-11 items-center justify-center rounded-full hover:bg-sv-cyan-tint/70 disabled:opacity-35 sm:h-10 sm:w-10"
              style={{
                color: "var(--sv-teal-mid)",
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={maxOrder}
              value={value}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  onChange(0);
                  return;
                }
                const digitsOnly = raw.replace(/\D/g, "").slice(0, 5);
                const n = Number(digitsOnly);
                if (!Number.isFinite(n)) {
                  onChange(0);
                  return;
                }
                onChange(Math.min(maxOrder, Math.max(0, Math.floor(n))));
              }}
              aria-label="Order quantity"
              className="sv-tabular sv-no-spin"
              style={{
                width: inputWidth,
                minWidth: "2.5ch",
                maxWidth: "calc(5ch + 10px)",
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: FO,
                fontWeight: 800,
                fontSize: 22,
                color: "var(--sv-ink)",
                textAlign: "center",
                letterSpacing: "-0.02em",
                // Width only — interruptible while digits grow/shrink
                transition: "width 120ms var(--sv-ease-out, ease), color 140ms ease",
                borderRadius: 0,
              }}
            />
            <button
              type="button"
              aria-label="Increase order"
              disabled={disabled || value >= maxOrder}
              onClick={() => onChange(Math.min(maxOrder, value + 1))}
              className="sv-press flex h-11 w-11 items-center justify-center rounded-full hover:bg-sv-cyan-tint/70 disabled:opacity-35 sm:h-10 sm:w-10"
              style={{
                color: "var(--sv-teal-mid)",
                fontSize: 22,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              +
            </button>
          </div>

          <GameButton
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="shrink-0 flex-1 touch-manipulation rounded-[var(--sv-radius-pill)] border border-white/60 bg-sv-cta-gradient text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_3px_rgba(0,44,51,0.18)] sm:flex-initial"
            style={{
              height: 48,
              minHeight: 48,
              padding: "0 20px",
              fontWeight: 700,
              fontSize: 14,
              borderRadius: "var(--sv-radius-pill)",
            }}
          >
            <span className="sm:hidden">Confirm</span>
            <span className="hidden sm:inline">Confirm order</span>
          </GameButton>
        </div>
      </div>
    </div>
  );
}
