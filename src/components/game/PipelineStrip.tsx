"use client";

import { FO, cardStyle } from "@/components/cyan";
import { Package, Truck } from "@/components/cyan/PixelIcons";
import type { OpeningRoundView } from "@/engine";
import { buildPipelineDisplay, type PipelineDisplaySlot } from "@/engine";

function unitLabel(unit: string, n: number): string {
  const base = unit.trim() || "Round";
  if (n === 1) return base.toLowerCase();
  // Week → weeks, Round → rounds
  if (base.endsWith("s") || base.endsWith("S")) return base.toLowerCase();
  return `${base.toLowerCase()}s`;
}

function slotTitle(
  slot: PipelineDisplaySlot,
  unit: string,
  compact: boolean,
): string {
  if (slot.kind === "arriving") {
    return compact ? "Now" : `Arriving this ${unit.toLowerCase()}`;
  }
  if (slot.kind === "pending_order") {
    if (slot.key === "just-ordered") {
      return compact ? "Just ordered" : "Order just placed";
    }
    return compact ? "Your order" : "Your new order";
  }
  if (slot.eta === 1) {
    return compact ? "Next" : `Next ${unit.toLowerCase()}`;
  }
  return compact
    ? `+${slot.eta}`
    : `In ${slot.eta} ${unitLabel(unit, slot.eta)}`;
}

function slotHint(slot: PipelineDisplaySlot, unit: string): string {
  if (slot.kind === "arriving") {
    if (
      slot.scheduled != null &&
      slot.scheduled > slot.amount
    ) {
      return `${slot.amount} of ${slot.scheduled} supplied`;
    }
    return "lands this period";
  }
  if (slot.kind === "pending_order") {
    return `arrives in ${slot.eta} ${unitLabel(unit, slot.eta)}`;
  }
  if (slot.eta === 1) {
    return `t+1 · next ${unit.toLowerCase()}`;
  }
  return `t+${slot.eta}`;
}

/**
 * Delivery pipeline rail — shows in-transit orders and the order about to be placed.
 * Slot math: pipeline[0] arrives this period; a new order lands after `delay` periods.
 *
 * `phase="decide"` — live decide screen (optional pending order preview).
 * `phase="after_round"` — post-submit: pipeline already advanced; first slot is next period.
 */
export function PipelineStrip({
  opening,
  delay,
  pipeline,
  pendingOrder,
  supplyRate,
  timelineUnit = "Round",
  /** Stack slots vertically — for the narrower side column beside decision. */
  compact = false,
  phase = "decide",
}: {
  opening: OpeningRoundView | null;
  delay: number;
  pipeline?: number[];
  /** Live order quantity from the decision dock (preview last slot). */
  pendingOrder?: number | null;
  supplyRate?: number;
  timelineUnit?: string;
  compact?: boolean;
  phase?: "decide" | "after_round";
}) {
  const unit = timelineUnit || "Round";
  const rate =
    supplyRate ??
    opening?.supplyRate ??
    1;
  const afterRound = phase === "after_round";

  const sourcePipeline =
    pipeline ??
    (opening
      ? [opening.scheduledOrder, ...opening.pipelineAfterDelivery]
      : []);

  // After a round is processed the pipeline is already advanced — no pending preview.
  const slots = buildPipelineDisplay({
    pipeline: sourcePipeline,
    deliveryDelay: delay,
    supplyRate: afterRound ? 1 : rate,
    pendingOrder: afterRound ? null : (pendingOrder ?? null),
  });

  // After-round: pipeline already advanced — first slot is next period, last is the order just placed.
  const displaySlots = afterRound
    ? slots.map((s, i) => {
        const isLast = i === slots.length - 1;
        const eta = s.eta + 1;
        return {
          ...s,
          eta,
          scheduled: undefined,
          kind: isLast ? ("pending_order" as const) : ("in_transit" as const),
          key: isLast ? "just-ordered" : `transit-eta-${eta}`,
        };
      })
    : slots;

  return (
    <div style={{ ...cardStyle, padding: compact ? 12 : 14, height: "100%" }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Truck size={16} color="var(--sv-teal-mid)" />
        <span
          style={{
            fontFamily: FO,
            fontWeight: 700,
            fontSize: 13,
            color: "var(--sv-ink)",
          }}
        >
          Delivery pipeline
        </span>
        <span
          style={{
            fontFamily: FO,
            fontSize: 11,
            color: "var(--sv-text-muted)",
          }}
        >
          · {delay} {unitLabel(unit, delay)} delay
        </span>
      </div>

      <p
        style={{
          fontFamily: FO,
          fontSize: 11,
          color: "var(--sv-text-secondary)",
          lineHeight: 1.4,
          marginBottom: compact ? 10 : 12,
        }}
      >
        {afterRound ? (
          <>
            After this {unit.toLowerCase()}, remaining stock is still in transit.
            Your order lands in{" "}
            <span style={{ fontWeight: 700, color: "var(--sv-ink)" }}>
              {delay} {unitLabel(unit, delay)}
            </span>
            .
          </>
        ) : (
          <>
            Orders move one slot each {unit.toLowerCase()}. A new order lands after{" "}
            <span style={{ fontWeight: 700, color: "var(--sv-ink)" }}>
              {delay} {unitLabel(unit, delay)}
            </span>
            .
          </>
        )}
      </p>

      {compact ? (
        <div className="flex flex-col gap-2">
          {displaySlots.map((s, idx) => (
            <SlotRow
              key={s.key}
              slot={s}
              unit={unit}
              compact
              showConnector={idx < displaySlots.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Rail behind slots */}
          <div
            aria-hidden
            className="absolute"
            style={{
              left: 12,
              right: 12,
              top: 36,
              height: 3,
              background: "var(--sv-border)",
              borderRadius: 9999,
            }}
          />
          <div
            className="relative grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${displaySlots.length}, minmax(0, 1fr))`,
            }}
          >
            {displaySlots.map((s) => (
              <SlotCard key={s.key} slot={s} unit={unit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotCard({
  slot,
  unit,
}: {
  slot: PipelineDisplaySlot;
  unit: string;
}) {
  const isNow = slot.kind === "arriving";
  const isPending = slot.kind === "pending_order";
  const accent = isNow
    ? "var(--sv-positive)"
    : isPending
      ? "var(--sv-teal-mid)"
      : "var(--sv-ink)";

  return (
    <div
      style={{
        background: isNow
          ? "color-mix(in srgb, var(--sv-positive) 8%, white)"
          : isPending
            ? "var(--sv-cyan-tint)"
            : "rgba(255,255,255,0.55)",
        border: isNow
          ? "1.5px solid color-mix(in srgb, var(--sv-positive) 35%, white)"
          : isPending
            ? "1.5px dashed color-mix(in srgb, var(--sv-teal-mid) 45%, white)"
            : "1.4px solid white",
        borderRadius: 12,
        padding: "12px 10px",
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        className="mx-auto mb-2 flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: isPending
            ? "color-mix(in srgb, var(--sv-teal-mid) 12%, white)"
            : "var(--sv-muted)",
          border: "1px solid white",
        }}
      >
        {isPending ? (
          <Package size={16} color="var(--sv-teal-mid)" />
        ) : (
          <Truck size={16} color={isNow ? "var(--sv-positive)" : "var(--sv-teal-mid)"} />
        )}
      </div>
      <div
        style={{
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--sv-text-muted)",
        }}
      >
        {slotTitle(slot, unit, false)}
      </div>
      <div
        className="sv-tabular"
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: accent,
          marginTop: 6,
          lineHeight: 1.1,
        }}
      >
        {slot.amount}
      </div>
      <div
        style={{
          fontFamily: FO,
          fontSize: 10,
          color: "var(--sv-text-muted)",
          marginTop: 4,
          lineHeight: 1.3,
        }}
      >
        units · {slotHint(slot, unit)}
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  unit,
  compact,
}: {
  slot: PipelineDisplaySlot;
  unit: string;
  compact: boolean;
  showConnector?: boolean;
}) {
  const isNow = slot.kind === "arriving";
  const isPending = slot.kind === "pending_order";
  const accent = isNow
    ? "var(--sv-positive)"
    : isPending
      ? "var(--sv-teal-mid)"
      : "var(--sv-ink)";

  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{
        background: isNow
          ? "color-mix(in srgb, var(--sv-positive) 8%, white)"
          : isPending
            ? "var(--sv-cyan-tint)"
            : "rgba(255,255,255,0.55)",
        border: isNow
          ? "1.5px solid color-mix(in srgb, var(--sv-positive) 35%, white)"
          : isPending
            ? "1.5px dashed color-mix(in srgb, var(--sv-teal-mid) 45%, white)"
            : "1.4px solid white",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--sv-muted)",
            border: "1px solid white",
          }}
        >
          {isPending ? (
            <Package size={14} color="var(--sv-teal-mid)" />
          ) : (
            <Truck
              size={14}
              color={isNow ? "var(--sv-positive)" : "var(--sv-teal-mid)"}
            />
          )}
        </div>
        <div className="min-w-0">
          <div
            style={{
              fontFamily: FO,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--sv-text-muted)",
            }}
          >
            {slotTitle(slot, unit, compact)}
          </div>
          <div
            style={{
              fontFamily: FO,
              fontSize: 10,
              color: "var(--sv-text-muted)",
              marginTop: 2,
            }}
          >
            {slotHint(slot, unit)}
          </div>
        </div>
      </div>
      <div
        className="sv-tabular"
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 22,
          color: accent,
          flexShrink: 0,
        }}
      >
        {slot.amount}
        <span
          style={{
            fontWeight: 600,
            fontSize: 11,
            color: "var(--sv-text-muted)",
            marginLeft: 4,
          }}
        >
          u
        </span>
      </div>
    </div>
  );
}
