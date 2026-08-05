"use client";

import BoxView, { type StatItem } from "@/components/game/BoxView";
import { backlogRag, inventoryRag } from "@/lib/ragStatus";
import type { OpeningRoundView, RoundRecord } from "@/engine";

/** KPI strip using classic Beer Game BoxView + logo assets + RAG. */
export function StatusStrip({
  opening,
  lastRecord,
  inventoryCost,
  backlogCost,
  cumulativeCost,
  /** Early-game: inventory, backlog, demand, cost only (4 cards). */
  simplified = false,
  startingInventory,
}: {
  opening: OpeningRoundView | null;
  lastRecord: RoundRecord | null;
  inventoryCost: number;
  backlogCost: number;
  cumulativeCost: number;
  simplified?: boolean;
  /** For inventory high-band (default ~2× starting). */
  startingInventory?: number;
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

  const highBand = Math.max(24, (startingInventory ?? 12) * 2);
  const invRag = inventoryRag(inv, demand, bl, highBand);
  const blRag = backlogRag(bl, demand);

  const deliverySub =
    scheduled > delivery
      ? `${delivery} of ${scheduled} supplied`
      : scheduled > 0
        ? "Full supply"
        : "Nothing due";

  const invCard: StatItem = {
    id: "inv",
    title: showResult ? "Ending inventory" : "Current inventory",
    value: String(inv),
    unit: "units",
    icon: "package",
    imageUrl: "/logos/inventory.svg",
    subtext: showResult
      ? `Holding cost × $${inventoryCost}`
      : "On hand before fulfilment",
    rag: invRag,
    color:
      invRag.level === "green" ? undefined : invRag.border,
  };
  const blCard: StatItem = {
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
    rag: blRag,
  };
  const demandCard: StatItem = {
    id: "demand",
    title: "Customer demand",
    value: String(demand),
    unit: "units",
    icon: "users",
    imageUrl: "/logos/demand.svg",
    subtext: "This round",
  };
  const deliveryCard: StatItem = {
    id: "delivery",
    title: "Delivery received",
    value: String(delivery),
    unit: "units",
    icon: "truck",
    imageUrl: "/logos/Truck.svg",
    subtext: deliverySub,
    subtextColor:
      scheduled > delivery ? "var(--sv-warning)" : "var(--sv-text-muted)",
  };
  const availableCard: StatItem = {
    id: "available",
    title: "Available stock",
    value: String(available),
    unit: "units",
    icon: "package",
    imageUrl: "/logos/package.svg",
    subtext: "Inventory + delivery",
  };
  const costCard: StatItem = {
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
  };

  // Early rounds: focus on the four decision drivers
  const data: StatItem[] = simplified
    ? [invCard, blCard, demandCard, costCard]
    : [invCard, blCard, demandCard, deliveryCard, availableCard, costCard];

  return <BoxView data={data} gridCols={simplified ? 4 : 6} dense />;
}
