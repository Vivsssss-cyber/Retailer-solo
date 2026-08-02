"use client";

import BoxView, { type StatItem } from "@/components/game/BoxView";
import type { OpeningRoundView, RoundRecord } from "@/engine";

/** KPI strip using classic Beer Game BoxView + logo assets. */
export function StatusStrip({
  opening,
  lastRecord,
  inventoryCost,
  backlogCost,
  cumulativeCost,
}: {
  opening: OpeningRoundView | null;
  lastRecord: RoundRecord | null;
  inventoryCost: number;
  backlogCost: number;
  cumulativeCost: number;
}) {
  const demand = lastRecord?.customer_demand ?? opening?.customerDemand ?? 0;
  const delivery = lastRecord?.incoming_delivery ?? opening?.incomingDelivery ?? 0;
  const scheduled = lastRecord?.scheduled_order ?? opening?.scheduledOrder ?? 0;
  const available =
    lastRecord != null
      ? lastRecord.opening_inventory + lastRecord.incoming_delivery
      : (opening?.availableUnits ?? 0);

  const showResult = !!lastRecord;
  const inv = showResult
    ? lastRecord!.ending_inventory
    : (opening?.openingInventory ?? 0);
  const bl = showResult
    ? lastRecord!.ending_backlog
    : (opening?.openingBacklog ?? 0);

  const roundCost = lastRecord?.round_cost;
  const cum = lastRecord?.cumulative_cost ?? cumulativeCost;

  const deliverySub =
    scheduled > delivery
      ? `${delivery} of ${scheduled} supplied`
      : scheduled > 0
        ? "Full supply"
        : "Nothing due";

  const data: StatItem[] = [
    {
      id: "inv",
      title: showResult ? "Ending inventory" : "Current inventory",
      value: String(inv),
      unit: "units",
      icon: "package",
      imageUrl: "/logos/inventory.svg",
      subtext: showResult
        ? `Holding cost × $${inventoryCost}`
        : "On hand before fulfilment",
    },
    {
      id: "bl",
      title: showResult ? "Ending backlog" : "Current backlog",
      value: String(bl),
      unit: "units",
      icon: "alert",
      imageUrl: bl > 0 ? "/logos/red-backlog.svg" : "/logos/backlog.svg",
      subtext:
        bl > 0
          ? `Costs $${bl * backlogCost}${showResult ? " this round" : " if carried"}`
          : "No unfilled demand",
      subtextColor: bl > 0 ? "var(--sv-negative)" : "var(--sv-text-muted)",
      color: bl > 0 ? "var(--sv-negative)" : undefined,
    },
    {
      id: "demand",
      title: "Customer demand",
      value: String(demand),
      unit: "units",
      icon: "users",
      imageUrl: "/logos/demand.svg",
      subtext: "This round",
    },
    {
      id: "delivery",
      title: "Delivery received",
      value: String(delivery),
      unit: "units",
      icon: "truck",
      imageUrl: "/logos/Truck.svg",
      subtext: deliverySub,
      subtextColor:
        scheduled > delivery ? "var(--sv-warning)" : "var(--sv-text-muted)",
    },
    {
      id: "available",
      title: "Available stock",
      value: String(available),
      unit: "units",
      icon: "package",
      imageUrl: "/logos/package.svg",
      subtext: "Inventory + delivery",
    },
    {
      id: "cost",
      title: showResult && roundCost != null ? "Round / cumulative cost" : "Cumulative cost",
      value:
        showResult && roundCost != null
          ? `$${roundCost.toLocaleString()}`
          : `$${cum.toLocaleString()}`,
      icon: "wallet",
      imageUrl: "/logos/total-cost.svg",
      subtext:
        showResult && roundCost != null
          ? `Cum $${cum.toLocaleString()}`
          : "Before this round settles",
    },
  ];

  return <BoxView data={data} gridCols={6} dense />;
}
