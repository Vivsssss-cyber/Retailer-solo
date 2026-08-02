"use client";

import { useMemo, useState } from "react";
import { FO, TabBar, cardStyle } from "@/components/cyan";
import GraphicalView from "@/components/game/GraphicalView";
import type { RoundRecord } from "@/engine";

/** Side panel chart matching /demo/beer-game Inventory | Cost tabs. */
export function TrendPanel({ rounds }: { rounds: RoundRecord[] }) {
  const [tab, setTab] = useState<"flow" | "cost">("flow");

  const chartData = useMemo(() => {
    if (rounds.length === 0) {
      return [{ name: "R0", Inventory: 0, Backlog: 0, Demand: 0, Orders: 0, Delivery: 0, "Total Cost": 0 }];
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

  const graphical = useMemo(() => {
    if (tab === "flow") {
      return {
        type: "evolution" as const,
        title: "",
        xAxis: "Rounds",
        yAxis: ["Inventory", "Backlog", "Demand", "Orders", "Delivery"],
        chartData,
        height: 240,
      };
    }
    return {
      type: "evolution" as const,
      title: "",
      xAxis: "Rounds",
      yAxis: ["Total Cost"],
      chartData,
      height: 240,
    };
  }, [tab, chartData]);

  return (
    <div style={{ ...cardStyle, padding: 12 }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          style={{
            fontFamily: FO,
            fontWeight: 700,
            fontSize: 13,
            color: "var(--sv-ink)",
          }}
        >
          Trend
        </span>
        <TabBar
          tabs={[
            { id: "flow", label: "Inventory & flow" },
            { id: "cost", label: "Cost over time" },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as "flow" | "cost")}
        />
      </div>
      <GraphicalView data={graphical} />
    </div>
  );
}
