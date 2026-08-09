"use client";

import { useSyncExternalStore } from "react";
import { FO } from "@/components/cyan";
import { Package, Truck } from "@/components/cyan/PixelIcons";
import StatusView from "@/components/game/StatusView";
import { buildPipelineDisplay } from "@/engine";
import type { OpeningRoundView } from "@/engine";
import {
  readPlayerAvatarSrc,
  subscribePlayerProfile,
} from "@/lib/playerProfile";

function usePlayerAvatar(): string | null {
  return useSyncExternalStore(
    subscribePlayerProfile,
    readPlayerAvatarSrc,
    () => null,
  );
}

function unitLabel(unit: string, n: number): string {
  const base = unit.trim() || "Round";
  if (n === 1) return base.toLowerCase();
  if (base.endsWith("s") || base.endsWith("S")) return base.toLowerCase();
  return `${base.toLowerCase()}s`;
}

/**
 * Early-game (rounds 1–2) delivery pipeline — same visual language as the
 * post-round summary: StatusView rail (Wholesaler → Retailer → Customer),
 * flow markers, player avatar, plus a delay/ETA strip for teaching.
 */
export function EarlyDeliveryPipeline({
  opening,
  delay,
  pipeline,
  pendingOrder,
  supplyRate,
  timelineUnit = "Round",
  playerName,
}: {
  opening: OpeningRoundView | null;
  delay: number;
  pipeline?: number[];
  /** Live order from the decision dock — previews upstream “Ordered”. */
  pendingOrder: number;
  supplyRate?: number;
  timelineUnit?: string;
  playerName: string;
}) {
  const playerAvatar = usePlayerAvatar();
  const unit = timelineUnit || "Round";
  const rate = supplyRate ?? opening?.supplyRate ?? 1;

  const incoming = opening?.incomingDelivery ?? 0;
  const scheduled = opening?.scheduledOrder ?? 0;
  const demand = opening?.customerDemand ?? 0;
  const backlog = opening?.openingBacklog ?? 0;
  const available = opening?.availableUnits ?? 0;
  const need = demand + backlog;
  const canShip = Math.min(available, need);

  const statusData = {
    title: "Supply Chain Overview",
    stages: ["Wholesaler", "Retailer", "Customer"],
    currentStage: "Retailer",
    incomingAmount: incoming,
    originalOrderAmount: scheduled,
    // Live preview of what the player is about to order upstream
    orderAmount: pendingOrder,
    // What you can ship toward customers this period (estimate before settle)
    outgoingAmount: canShip,
    incomingDemand: need,
  };

  const sourcePipeline =
    pipeline ??
    (opening
      ? [opening.scheduledOrder, ...opening.pipelineAfterDelivery]
      : []);

  const slots = buildPipelineDisplay({
    pipeline: sourcePipeline,
    deliveryDelay: delay,
    supplyRate: rate,
    pendingOrder,
  });

  const delayLabel =
    delay === 1
      ? `1 ${unitLabel(unit, 1)}`
      : `${delay} ${unitLabel(unit, delay)}`;

  return (
    <div className="h-full min-h-0 flex flex-col gap-0 overflow-x-hidden overflow-y-auto">
      <StatusView
        data={statusData}
        showSimulation
        playerAvatarSrc={playerAvatar}
        playerName={playerName}
      >
        {/* Delay teaching strip — same glass language as summary KPIs */}
        <div
          className="mt-1 pt-3"
          style={{ borderTop: "1px solid var(--sv-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--sv-text-secondary)",
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              Orders you place now arrive after{" "}
              <span style={{ fontWeight: 800, color: "var(--sv-ink)" }}>
                {delayLabel}
              </span>
              . Markers above show receive · order · ship.
            </p>
          </div>

          {/* Compact ETA chips (pipeline slots) under the rail */}
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${Math.max(slots.length, 1)}, minmax(0, 1fr))`,
            }}
            aria-label="Delivery timing"
          >
            {slots.map((s) => {
              const isNow = s.kind === "arriving";
              const isPending = s.kind === "pending_order";
              const label = isNow
                ? "Now"
                : isPending
                  ? "Your order"
                  : s.eta === 1
                    ? `Next ${unit.toLowerCase()}`
                    : `+${s.eta}`;
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center text-center min-w-0 px-1 py-2 rounded-xl"
                  style={{
                    background: isNow
                      ? "color-mix(in srgb, var(--sv-positive) 10%, white)"
                      : isPending
                        ? "var(--sv-cyan-tint)"
                        : "rgba(255,255,255,0.55)",
                    border: isNow
                      ? "1.5px solid color-mix(in srgb, var(--sv-positive) 35%, white)"
                      : isPending
                        ? "1.5px dashed color-mix(in srgb, var(--sv-teal-mid) 45%, white)"
                        : "1.4px solid white",
                  }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    {isPending ? (
                      <Package size={12} color="var(--sv-teal-mid)" />
                    ) : (
                      <Truck
                        size={12}
                        color={isNow ? "var(--sv-positive)" : "var(--sv-teal-mid)"}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: FO,
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--sv-text-muted)",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  <span
                    className="sv-tabular"
                    style={{
                      fontFamily: FO,
                      fontWeight: 800,
                      fontSize: 18,
                      color: isNow
                        ? "var(--sv-positive)"
                        : isPending
                          ? "var(--sv-teal-mid)"
                          : "var(--sv-ink)",
                      lineHeight: 1.1,
                    }}
                  >
                    {s.amount}
                  </span>
                  <span
                    style={{
                      fontFamily: FO,
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--sv-text-muted)",
                      marginTop: 2,
                    }}
                  >
                    units
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </StatusView>
    </div>
  );
}
