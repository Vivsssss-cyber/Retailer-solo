"use client";

import { FO } from "@/components/cyan";
import BoxView, { type StatItem } from "@/components/game/BoxView";
import { PlayTour } from "@/components/game/PlayTour";
import type { GameConfig } from "@/engine";

/**
 * Onboarding step: static warehouse preview + the same focused-element
 * coach tour used in-play (dark neutral overlay + spotlight holes).
 */
export function OnboardingWarehouseTour({
  config,
  onComplete,
}: {
  config: GameConfig;
  onComplete: () => void;
}) {
  const unit = config.timeline_unit || "Round";
  const inv = config.starting_inventory;
  const demand = config.customer_demand_by_round[0] ?? 4;
  const delay = config.delivery_delay;

  const kpis: StatItem[] = [
    {
      id: "inv",
      title: "Current inventory",
      value: String(inv),
      unit: "units",
      icon: "package",
      imageUrl: "/logos/inventory.svg",
      subtext: "On hand before fulfilment",
    },
    {
      id: "bl",
      title: "Current backlog",
      value: "0",
      unit: "units",
      icon: "alert",
      imageUrl: "/logos/backlog.svg",
      subtext: "Unfilled demand carried",
    },
    {
      id: "demand",
      title: "Customer demand",
      value: String(demand),
      unit: "units",
      icon: "users",
      imageUrl: "/logos/demand.svg",
      subtext: `This ${unit.toLowerCase()}`,
    },
    {
      id: "cost",
      title: "Total cost",
      value: "$0",
      icon: "wallet",
      imageUrl: "/logos/total-cost.svg",
      subtext: "Lowest wins",
    },
  ];

  return (
    <div className="relative w-full max-w-[720px] mx-auto">
      <div className="mb-3 text-center sm:text-left">
        <p
          style={{
            fontFamily: FO,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--sv-teal-mid)",
          }}
        >
          Warehouse walkthrough
        </p>
        <h2
          style={{
            fontFamily: FO,
            fontWeight: 700,
            fontSize: 22,
            color: "var(--sv-ink)",
            marginTop: 4,
            lineHeight: 1.2,
          }}
        >
          Meet the play screen
        </h2>
        <p
          style={{
            fontFamily: FO,
            fontSize: 14,
            color: "var(--sv-text-secondary)",
            marginTop: 6,
            lineHeight: 1.45,
          }}
        >
          Your coach will spotlight each area. Same walkthrough is available later via How
          to play.
        </p>
      </div>

      {/* Preview shell — targets for PlayTour data-tour holes */}
      <div
        className="flex flex-col gap-3 rounded-2xl p-3 sm:p-4"
        style={{
          background: "color-mix(in srgb, var(--sv-card) 90%, white)",
          border: "1.4px solid white",
          boxShadow: "var(--sv-shadow-2)",
        }}
      >
        <div data-tour="kpis" className="min-w-0">
          <BoxView data={kpis} dense gridCols={2} />
        </div>

        <div
          data-tour="graphs"
          className="min-h-[100px] rounded-xl flex items-center justify-center px-3"
          style={{
            background: "rgba(255,255,255,0.75)",
            border: "1.4px solid var(--sv-border)",
          }}
        >
          <p
            style={{
              fontFamily: FO,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sv-text-muted)",
              textAlign: "center",
            }}
          >
            Trends — inventory, backlog, demand & cost fill as you play
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_minmax(140px,180px)] gap-3">
          <div
            data-tour="history"
            className="min-h-[88px] rounded-xl px-3 py-2.5"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1.4px solid var(--sv-border)",
            }}
          >
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--sv-ink)",
                marginBottom: 4,
              }}
            >
              Game progress
            </p>
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                color: "var(--sv-text-muted)",
                lineHeight: 1.4,
              }}
            >
              Each {unit.toLowerCase()} lands here — stock, demand, your order, cost.
              Orders take {delay} {unit.toLowerCase()}
              {delay === 1 ? "" : "s"} to arrive.
            </p>
          </div>

          <div
            className="min-h-[88px] rounded-xl px-3 py-2.5 flex flex-col justify-center"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1.4px solid var(--sv-border)",
            }}
          >
            <p
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--sv-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Live board
            </p>
            <p
              style={{
                fontFamily: FO,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--sv-ink)",
                marginTop: 4,
              }}
            >
              Heat ranks appear here
            </p>
          </div>
        </div>

        <div
          data-tour="order"
          className="rounded-full px-4 py-3 flex items-center justify-between gap-3"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "1.6px solid var(--sv-border)",
            boxShadow: "var(--sv-shadow-1)",
          }}
        >
          <span
            style={{
              fontFamily: FO,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sv-text-secondary)",
            }}
          >
            Your order
          </span>
          <span
            className="sv-tabular"
            style={{
              fontFamily: FO,
              fontSize: 22,
              fontWeight: 800,
              color: "var(--sv-teal-mid)",
            }}
          >
            4
          </span>
          <span
            style={{
              fontFamily: FO,
              fontSize: 12,
              fontWeight: 700,
              color: "white",
              background: "var(--sv-teal-mid)",
              borderRadius: 999,
              padding: "8px 14px",
            }}
          >
            Place order
          </span>
        </div>
      </div>

      <PlayTour
        config={config}
        replay
        finishLabel="Continue"
        onComplete={onComplete}
      />
    </div>
  );
}
