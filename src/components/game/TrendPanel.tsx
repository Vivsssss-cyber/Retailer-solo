"use client";

import { useMemo } from "react";
import { FO, cardStyle } from "@/components/cyan";
import GraphicalView from "@/components/game/GraphicalView";
import type { RoundRecord } from "@/engine";

/**
 * Two side-by-side graphs (Rochak demo parity):
 * 1) Inventory + Backlog + Demand (flow)
 * 2) Cumulative cost
 */
export function TrendPanel({
  rounds,
  dense = false,
}: {
  rounds: RoundRecord[];
  dense?: boolean;
}) {
  // Real game rounds only — R1, R2, … (no fake R0 zeros that skew axes / legend)
  const chartData = useMemo(
    () =>
      rounds.map((r) => ({
        name: `R${r.round}`,
        Inventory: r.ending_inventory,
        Backlog: r.ending_backlog,
        Demand: r.customer_demand,
        "Total Cost": r.cumulative_cost,
      })),
    [rounds],
  );

  const flowGraphical = useMemo(
    () => ({
      type: "evolution" as const,
      title: "",
      xAxis: "Rounds",
      yAxis: ["Inventory", "Backlog", "Demand"],
      chartData,
      height: dense ? undefined : 200,
      embedded: dense,
      fill: dense,
    }),
    [chartData, dense],
  );

  const costGraphical = useMemo(
    () => ({
      type: "evolution" as const,
      title: "",
      xAxis: "Rounds",
      yAxis: ["Total Cost"],
      chartData,
      height: dense ? undefined : 200,
      embedded: dense,
      fill: dense,
    }),
    [chartData, dense],
  );

  const titleStyle = {
    fontFamily: FO,
    fontWeight: 700 as const,
    fontSize: dense ? 11 : 12,
    color: "var(--sv-ink)",
  };

  const cardPad = dense ? 12 : 14;

  /**
   * Floor that fits card chrome + legend + plot + x-axis. Below lg the parent is
   * auto-height and this is what actually sizes the card; at lg the viewport-locked
   * shell drives height and the floor is released so the row can compress.
   */
  const cardSize = dense
    ? "min-h-[232px] sm:min-h-[248px] lg:min-h-0 lg:h-full"
    : "";

  return (
    <div
      className={[
        "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-h-0 min-w-0 w-full",
        dense ? "h-full" : "",
      ].join(" ")}
    >
      <div
        style={{
          ...cardStyle,
          padding: cardPad,
          height: dense ? "100%" : undefined,
          minHeight: dense ? 0 : undefined,
          // Allow tooltip / axis ticks to paint outside plot box
          overflow: "visible",
        }}
        className={`sv-surface sv-chart-card flex flex-col min-h-0 min-w-0 w-full ${cardSize}`}
      >
        <div className={`shrink-0 ${dense ? "mb-1.5" : "mb-2"}`}>
          <span style={titleStyle}>Inventory &amp; flow</span>
        </div>
        <div
          className={
            dense
              ? "flex-1 min-h-0 min-w-0 w-full overflow-visible"
              : "w-full min-w-0 shrink-0 overflow-visible"
          }
        >
          <GraphicalView data={flowGraphical} />
        </div>
      </div>

      <div
        style={{
          ...cardStyle,
          padding: cardPad,
          height: dense ? "100%" : undefined,
          minHeight: dense ? 0 : undefined,
          overflow: "visible",
        }}
        className={`sv-surface sv-chart-card flex flex-col min-h-0 min-w-0 w-full ${cardSize}`}
      >
        <div className={`shrink-0 ${dense ? "mb-1.5" : "mb-2"}`}>
          <span style={titleStyle}>Cost over time</span>
        </div>
        <div
          className={
            dense
              ? "flex-1 min-h-0 min-w-0 w-full overflow-visible"
              : "w-full min-w-0 shrink-0 overflow-visible"
          }
        >
          <GraphicalView data={costGraphical} />
        </div>
      </div>
    </div>
  );
}
