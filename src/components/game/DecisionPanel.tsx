"use client";

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

  return (
    <div
      role="region"
      aria-label="Place order"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 w-[min(720px,calc(100vw-1rem))] sm:w-[min(740px,calc(100vw-1.5rem))] pointer-events-none"
    >
      <div
        className="sv-frost-dock pointer-events-auto flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 rounded-sv-pill"
        style={{
          padding: "10px 10px 10px 14px",
          border: "1.5px solid var(--sv-border)",
          backdropFilter: "blur(56px) saturate(1.55)",
          WebkitBackdropFilter: "blur(56px) saturate(1.55)",
        }}
      >
        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 px-0.5 sm:px-0">
          <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "var(--sv-cyan-tint)",
              border: "1px solid var(--sv-border)",
            }}
            aria-hidden
          >
            <Package size={16} color="var(--sv-teal-mid)" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                style={{
                  fontFamily: FO,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--sv-ink)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                Place order
              </span>
              <span
                style={{
                  fontFamily: FO,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--sv-text-secondary)",
                }}
              >
                {timelineUnit} {currentRound}
                <span style={{ color: "var(--sv-text-muted)", fontWeight: 500 }}>
                  {" "}
                  of {totalRounds}
                </span>
              </span>
            </div>
            <p
              className="mt-0.5 line-clamp-2 sm:line-clamp-1"
              style={{
                fontFamily: FO,
                fontSize: 12,
                fontWeight: 500,
                color: arrivesAfterEnd ? "var(--sv-warning)" : "var(--sv-text-secondary)",
                lineHeight: 1.35,
              }}
            >
              {arrivalCopy}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
          <div
            className="flex items-center gap-0.5 flex-1 sm:flex-initial justify-center rounded-sv-pill"
            style={{
              background: "rgba(255,255,255,0.82)",
              border: "1.4px solid var(--sv-border)",
              padding: "3px 4px",
              height: 48,
              minHeight: 48,
            }}
          >
            <button
              type="button"
              aria-label="Decrease order"
              disabled={disabled || value <= 0}
              onClick={() => onChange(Math.max(0, value - 1))}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center disabled:opacity-35 touch-manipulation transition-colors hover:bg-sv-cyan-tint/70"
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
                // Cap to 5 digits while typing; clamp to maxOrder
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
                transition: "width 120ms ease",
              }}
            />
            <button
              type="button"
              aria-label="Increase order"
              disabled={disabled || value >= maxOrder}
              onClick={() => onChange(Math.min(maxOrder, value + 1))}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center disabled:opacity-35 touch-manipulation transition-colors hover:bg-sv-cyan-tint/70"
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
            className="shrink-0 flex-1 sm:flex-initial touch-manipulation rounded-sv-pill bg-sv-cta-gradient text-white border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_3px_rgba(0,44,51,0.18)]"
            style={{
              height: 48,
              minHeight: 48,
              padding: "0 22px",
              fontWeight: 700,
              fontSize: 14,
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
