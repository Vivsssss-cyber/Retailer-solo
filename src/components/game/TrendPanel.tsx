"use client";

import { useMemo, useState } from "react";
import { FO, TabBar, cardStyle } from "@/components/cyan";
import GraphicalView from "@/components/game/GraphicalView";
import type { RoundRecord } from "@/engine";

/** Side panel chart matching /demo/beer-game Inventory | Cost tabs. */
export function TrendPanel({
  rounds,
  dense = false,
}: {
  rounds: RoundRecord[];
  dense?: boolean;
}) {
  const [tab, setTab] = useState<"flow" | "cost">("flow");

  const chartData = useMemo(() => {
    if (rounds.length === 0) {
      return [
        {
          name: "R0",
          Inventory: 0,
          Backlog: 0,
          Demand: 0,
          Orders: 0,
          Delivery: 0,
          "Total Cost": 0,
        },
      ];
    }
    return rounds.map((r) => ({
      name: `R${r.round}`,
      Inventory: r.ending_inventory,
      Backlog: r.ending_backlog,
      Demand: r.customer_demand,
      Orders: r.placed_order,
      Delivery: r.incoming_delivery,
      "Total Cost": r.cumulative_cost,
    }));
  }, [rounds]);

  /**
   * Dense (play shell): fill parent via ResizeObserver — no fixed px trap.
   * Standalone: fixed plot height for natural document flow.
   */
  const graphical = useMemo(() => {
    if (tab === "flow") {
      return {
        type: "evolution" as const,
        title: "",
        xAxis: "Rounds",
        yAxis: ["Inventory", "Backlog", "Demand", "Orders", "Delivery"],
        chartData,
        height: dense ? undefined : 240,
        embedded: dense,
        fill: dense,
      };
    }
    return {
      type: "evolution" as const,
      title: "",
      xAxis: "Rounds",
      yAxis: ["Total Cost"],
      chartData,
      height: dense ? undefined : 240,
      embedded: dense,
      fill: dense,
    };
  }, [tab, chartData, dense]);

  return (
    <div
      style={{
        ...cardStyle,
        padding: dense ? 8 : 12,
        height: dense ? "100%" : undefined,
        minHeight: dense ? 0 : undefined,
      }}
      className="flex flex-col min-h-0 min-w-0 w-full"
    >
      <div
        className={`flex items-center justify-between gap-2 ${dense ? "mb-1" : "mb-2"} shrink-0`}
      >
        <span
          style={{
            fontFamily: FO,
            fontWeight: 700,
            fontSize: dense ? 12 : 13,
            color: "var(--sv-ink)",
          }}
        >
          Trend
        </span>
        <TabBar
          tabs={[
            { id: "flow", label: dense ? "Flow" : "Inventory & flow" },
            { id: "cost", label: dense ? "Cost" : "Cost over time" },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as "flow" | "cost")}
        />
      </div>
      {/*
        Dense: flex-1 so GraphicalView can measure a real height on big screens.
        Non-dense: natural height from fixed plot.
      */}
      <div
        className={
          dense
            ? "flex-1 min-h-0 min-w-0 w-full"
            : "w-full min-w-0 shrink-0"
        }
      >
        <GraphicalView data={graphical} />
      </div>
    </div>
  );
}
