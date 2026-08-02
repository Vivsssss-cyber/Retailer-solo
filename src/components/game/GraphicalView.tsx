"use client";

import React, { useState } from "react";
import {
  CartesianGrid,
  Dot,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface EvolutionChartData {
  title?: string;
  yAxis?: string[];
  xAxis?: string;
  type?: "evolution";
  chartData?: Record<string, string | number>[];
  /** Compact height for single-screen play */
  height?: number | string;
}

interface GraphicalViewProps {
  data: EvolutionChartData;
}

/**
 * Beer Game evolution chart — ported from classic GraphicalView (type: evolution).
 * Used on /demo/beer-game dashboard and reports.
 */
export default function GraphicalView({ data }: GraphicalViewProps) {
  const [disabledMetrics, setDisabledMetrics] = useState<string[]>([]);

  if (!data?.chartData || data.chartData.length === 0) {
    return (
      <div
        style={{
          background: "var(--sv-card)",
          border: "1.4px solid white",
          borderRadius: 16,
          padding: 20,
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--sv-font-ui)",
          color: "var(--sv-text-muted)",
          fontSize: 13,
        }}
      >
        No round data yet — place your first order to build the trend.
      </div>
    );
  }

  const isMetricEnabled = (metricName: string) => !disabledMetrics.includes(metricName);

  const stockKey =
    data.yAxis?.find(
      (y) => y.toLowerCase() === "stock" || y.toLowerCase() === "inventory",
    ) || "Inventory";
  const showStock = isMetricEnabled(stockKey);
  const showBacklog =
    data.yAxis?.some((y) => y.toLowerCase() === "backlog" && isMetricEnabled(y)) ?? false;
  const showOrders =
    data.yAxis?.some((y) => y.toLowerCase().includes("order") && isMetricEnabled(y)) ?? false;
  const showDemand =
    data.yAxis?.some((y) => y.toLowerCase() === "demand" && isMetricEnabled(y)) ?? false;
  const showDelivery =
    data.yAxis?.some((y) => y.toLowerCase() === "delivery" && isMetricEnabled(y)) ?? false;

  const costKeys =
    data.yAxis?.filter((y) => y.toLowerCase().includes("cost") && isMetricEnabled(y)) || [];
  const showCosts = costKeys.length > 0;
  const hasUnits = showStock || showBacklog || showOrders || showDemand || showDelivery;
  const costsOnLeft = showCosts && !hasUnits;
  const height = data.height ?? 280;

  const toggle = (key: string) => {
    setDisabledMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const legendItems = (data.yAxis ?? []).map((key) => {
    const lower = key.toLowerCase();
    let color = "var(--sv-chart-1)";
    if (lower === "backlog") color = "var(--sv-ink)";
    else if (lower.includes("order")) color = "var(--sv-warning)";
    else if (lower === "demand") color = "var(--sv-chart-3)";
    else if (lower === "delivery") color = "var(--sv-positive)";
    else if (lower.includes("cost")) color = "var(--sv-teal-mid)";
    else if (lower === "inventory" || lower === "stock") color = "var(--sv-cyan)";
    return { key, color, enabled: isMetricEnabled(key) };
  });

  return (
    <div
      style={{
        background: "var(--sv-card)",
        border: "1.4px solid white",
        borderRadius: 16,
        padding: 16,
        minHeight: typeof height === "number" ? height : 0,
        height: typeof height === "string" ? height : undefined,
        boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.06)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {data.title ? (
        <h3
          style={{
            fontFamily: "var(--sv-font-ui)",
            fontWeight: 800,
            fontSize: 16,
            color: "var(--sv-ink)",
            marginBottom: 8,
          }}
        >
          {data.title}
        </h3>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-2">
        {legendItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            style={{
              fontFamily: "var(--sv-font-ui)",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 9999,
              border: "1px solid var(--sv-border)",
              background: item.enabled ? "var(--sv-cyan-tint)" : "transparent",
              color: item.enabled ? "var(--sv-ink)" : "var(--sv-text-muted)",
              opacity: item.enabled ? 1 : 0.5,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: item.color,
              }}
            />
            {item.key}
          </button>
        ))}
      </div>

      <div className="w-full flex-1 min-h-0" style={{ height: typeof height === "string" ? height : undefined }}>
        <ResponsiveContainer width="100%" height={typeof height === "string" ? "100%" : height}>
          <LineChart
            data={data.chartData}
            margin={{ top: 24, right: showCosts ? 48 : 12, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sv-border)" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={{ fill: "var(--sv-text-muted)", fontSize: 11 }}
              label={{
                value: data.xAxis || "Rounds",
                position: "insideBottom",
                offset: -10,
                fill: "var(--sv-text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={{ fill: "var(--sv-text-muted)", fontSize: 11 }}
              domain={costsOnLeft ? [0, "auto"] : ["auto", "auto"]}
              label={{
                value: costsOnLeft ? "Cost ($)" : "Units",
                angle: -90,
                position: "insideLeft",
                fill: "var(--sv-text-muted)",
                fontSize: 12,
              }}
            />
            {showCosts && !costsOnLeft && (
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fill: "var(--sv-text-muted)", fontSize: 11 }}
                domain={[0, "auto"]}
                label={{
                  value: "Cost",
                  angle: 90,
                  position: "insideRight",
                  fill: "var(--sv-text-muted)",
                  fontSize: 12,
                }}
                tickFormatter={(value) => `$ ${value}`}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "none",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.10)",
                fontFamily: "var(--sv-font-ui)",
              }}
              labelStyle={{ color: "var(--sv-ink)", fontWeight: 800 }}
            />

            {showOrders && (
              <Line
                yAxisId="left"
                type="natural"
                dataKey="Orders"
                stroke="var(--sv-warning)"
                strokeWidth={2}
                dot={(props) => {
                  const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                  return (
                    <Dot
                      key={key ?? `orders-${rest.payload?.name ?? rest.index}`}
                      r={4}
                      cx={rest.cx}
                      cy={rest.cy}
                      fill="var(--sv-warning)"
                      stroke="var(--sv-warning)"
                    />
                  );
                }}
              />
            )}

            {showDemand && (
              <Line
                yAxisId="left"
                type="natural"
                dataKey="Demand"
                stroke="var(--sv-chart-3)"
                strokeWidth={2}
                dot={(props) => {
                  const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                  return (
                    <Dot
                      key={key ?? `demand-${rest.payload?.name ?? rest.index}`}
                      r={4}
                      cx={rest.cx}
                      cy={rest.cy}
                      fill="var(--sv-chart-3)"
                      stroke="var(--sv-chart-3)"
                    />
                  );
                }}
              />
            )}

            {showDelivery && (
              <Line
                yAxisId="left"
                type="natural"
                dataKey="Delivery"
                stroke="var(--sv-positive)"
                strokeWidth={2}
                dot={(props) => {
                  const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                  return (
                    <Dot
                      key={key ?? `delivery-${rest.payload?.name ?? rest.index}`}
                      r={4}
                      cx={rest.cx}
                      cy={rest.cy}
                      fill="var(--sv-positive)"
                      stroke="var(--sv-positive)"
                    />
                  );
                }}
              />
            )}

            {showStock && (
              <Line
                yAxisId="left"
                type="natural"
                dataKey={stockKey}
                stroke="var(--sv-cyan)"
                strokeWidth={2}
                dot={(props) => {
                  const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                  return (
                    <Dot
                      key={key ?? `stock-${rest.payload?.name ?? rest.index}`}
                      r={4}
                      cx={rest.cx}
                      cy={rest.cy}
                      fill="var(--sv-cyan)"
                      stroke="var(--sv-cyan)"
                    />
                  );
                }}
              />
            )}

            {showBacklog && (
              <Line
                yAxisId="left"
                type="natural"
                dataKey="Backlog"
                stroke="var(--sv-ink)"
                strokeWidth={2}
                dot={(props) => {
                  const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                  return (
                    <Dot
                      key={key ?? `backlog-${rest.payload?.name ?? rest.index}`}
                      r={4}
                      cx={rest.cx}
                      cy={rest.cy}
                      fill="var(--sv-ink)"
                      stroke="var(--sv-ink)"
                    />
                  );
                }}
              />
            )}

            {(() => {
              const totalCostKey = data.yAxis?.find(
                (y) =>
                  y.toLowerCase() === "total cost" ||
                  y.toLowerCase() === "costs" ||
                  y.toLowerCase() === "totalcost",
              );
              if (!totalCostKey || !isMetricEnabled(totalCostKey)) return null;

              return (
                <Line
                  yAxisId={costsOnLeft ? "left" : "right"}
                  type="natural"
                  dataKey={totalCostKey}
                  stroke="var(--sv-teal-mid)"
                  strokeWidth={2}
                  dot={(props) => {
                    const { key, ...rest } = props as { key?: string; cx?: number; cy?: number; payload?: { name?: string }; index?: number };
                    return (
                      <Dot
                        key={key ?? `cost-${rest.payload?.name ?? rest.index}`}
                        r={4}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-teal-mid)"
                        stroke="var(--sv-teal-mid)"
                      />
                    );
                  }}
                >
                  <LabelList
                    dataKey={totalCostKey}
                    position="top"
                    offset={16}
                    fontSize={10}
                    fill="var(--sv-teal-mid)"
                    formatter={(val) =>
                      typeof val === "number" && val > 0 ? val.toLocaleString() : ""
                    }
                  />
                </Line>
              );
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
