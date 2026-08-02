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
  lastDemand,
  backlog,
  inventory,
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
  lastDemand: number;
  backlog: number;
  inventory: number;
  timelineUnit?: string;
}) {
  const arrival = expectedArrivalRound(currentRound, deliveryDelay);
  const arrivesAfterEnd = arrival > totalRounds;
  const unitLower = timelineUnit.toLowerCase();
  const delayLabel =
    deliveryDelay === 1
      ? `1 ${unitLower}`
      : `${deliveryDelay} ${unitLower}${unitLower.endsWith("s") ? "" : "s"}`;

  return (
    <div
      role="region"
      aria-label="Place order"
      className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-[min(720px,calc(100vw-1.5rem))] pointer-events-none"
    >
      <div
        className="sv-frost-dock pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-2.5 rounded-sv-pill"
        style={{
          padding: "8px 8px 8px 14px",
          borderRadius: 9999,
          border: "1.5px solid var(--sv-border)",
          backdropFilter: "blur(56px) saturate(1.55)",
          WebkitBackdropFilter: "blur(56px) saturate(1.55)",
        }}
      >
        <Package size={18} color="var(--sv-teal-mid)" className="shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span
            style={{
              fontFamily: FO,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--sv-teal-mid)",
            }}
          >
            Place order · {timelineUnit} {currentRound}
          </span>
          <span
            style={{
              fontFamily: FO,
              fontSize: 11,
              color: "var(--sv-text-secondary)",
              lineHeight: 1.35,
            }}
          >
            Demand {lastDemand} · Backlog {backlog} · Stock {inventory}
            {arrivesAfterEnd
              ? " · arrives after game end (no effect)"
              : ` · lands in ${delayLabel} (${timelineUnit} ${arrival})`}
          </span>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "1.4px solid var(--sv-border)",
            borderRadius: 9999,
            padding: "4px 6px",
            height: 44,
          }}
        >
          <button
            type="button"
            aria-label="Decrease"
            disabled={disabled}
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ color: "var(--sv-teal-mid)", fontSize: 18, fontWeight: 700 }}
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={maxOrder}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            aria-label="Order quantity"
            className="sv-tabular sv-no-spin"
            style={{
              width: 48,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: FO,
              fontWeight: 700,
              fontSize: 20,
              color: "var(--sv-text)",
              textAlign: "center",
            }}
          />
          <span
            style={{
              fontFamily: FO,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--sv-text-muted)",
            }}
          >
            units
          </span>
          <button
            type="button"
            aria-label="Increase"
            disabled={disabled}
            onClick={() => onChange(Math.min(maxOrder, value + 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ color: "var(--sv-teal-mid)", fontSize: 18, fontWeight: 700 }}
          >
            +
          </button>
        </div>

        <GameButton
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className="shrink-0"
          style={{ height: 44, borderRadius: 30, padding: "0 22px" }}
        >
          Confirm order
        </GameButton>
      </div>
    </div>
  );
}
