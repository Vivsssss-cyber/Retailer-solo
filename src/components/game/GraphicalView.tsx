"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
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
  /**
   * Chart plot height in px (preferred for report / non-fill cards).
   * Avoid `"100%"` alone — Recharts ResponsiveContainer collapses to 0 when the
   * parent only has min-height (common on mobile scroll layouts).
   * When `embedded`/`fill`, height is measured from the flex parent instead.
   */
  height?: number | string;
  /** Nest inside TrendPanel card — drop outer chrome so we don't double-card. */
  embedded?: boolean;
  /**
   * Fill available parent height via ResizeObserver (pixel height fed to Recharts).
   * Defaults to true when `embedded` is set.
   */
  fill?: boolean;
}

interface GraphicalViewProps {
  data: EvolutionChartData;
}

const FALLBACK_PLOT_H = 180;
const MIN_FILL_H = 120;

/** Default-on series for multi-metric flow charts. */
const DEFAULT_ON = new Set(["inventory", "stock", "backlog", "demand"]);

/**
 * Flow charts (inventory + backlog + demand + …): start with only those three on.
 * Cost-only / other charts: leave all series enabled.
 */
function initialDisabledMetrics(yAxis?: string[]): string[] {
  if (!yAxis?.length) return [];
  const lower = yAxis.map((y) => y.toLowerCase());
  const hasFlowCore =
    lower.some((y) => y === "inventory" || y === "stock") &&
    lower.some((y) => y === "backlog") &&
    lower.some((y) => y === "demand");
  if (!hasFlowCore) return [];
  return yAxis.filter((y) => {
    const l = y.toLowerCase();
    if (DEFAULT_ON.has(l)) return false;
    if (l.includes("cost")) return false;
    return true; // e.g. Orders, Delivery
  });
}

function resolveFixedHeight(raw: number | string | undefined): number {
  if (typeof raw === "number" && raw > 0) return raw;
  return FALLBACK_PLOT_H;
}

/**
 * Beer Game evolution chart — ported from classic GraphicalView (type: evolution).
 * Used on /demo/beer-game dashboard and reports.
 */
export default function GraphicalView({ data }: GraphicalViewProps) {
  const [disabledMetrics, setDisabledMetrics] = useState<string[]>(() =>
    initialDisabledMetrics(data.yAxis),
  );

  const fill = data.fill ?? Boolean(data.embedded);
  const embedded = Boolean(data.embedded);
  const fixedHeight = resolveFixedHeight(data.height);

  const plotHostRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState({ w: 0, h: fixedHeight });

  useLayoutEffect(() => {
    const el = plotHostRef.current;
    if (!el) return;

    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setPlotSize((prev) => {
        const nextH = fill
          ? Math.max(h > 0 ? h : fixedHeight, MIN_FILL_H)
          : fixedHeight;
        const nextW = w > 0 ? w : prev.w;
        if (prev.w === nextW && prev.h === nextH) return prev;
        return { w: nextW, h: nextH };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill, fixedHeight, data.chartData?.length]);

  if (!data?.chartData || data.chartData.length === 0) {
    return (
      <div
        style={{
          background: embedded ? "transparent" : "var(--sv-card)",
          border: embedded ? "none" : "1.4px solid white",
          borderRadius: 16,
          padding: embedded ? 8 : 20,
          minHeight: fill ? MIN_FILL_H : 200,
          height: fill || embedded ? "100%" : undefined,
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

  const plotHeight = fill ? plotSize.h : fixedHeight;
  const narrow = plotSize.w > 0 && plotSize.w < 420;
  const veryNarrow = plotSize.w > 0 && plotSize.w < 320;
  const tickFs = veryNarrow ? 9 : narrow ? 10 : 11;
  const labelFs = veryNarrow ? 10 : 12;
  const pointCount = data.chartData.length;
  const xInterval =
    narrow && pointCount > 8 ? Math.ceil(pointCount / 6) - 1 : pointCount > 14 ? 1 : 0;

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
      className={fill || embedded ? "h-full min-h-0 flex flex-col w-full min-w-0" : undefined}
      style={
        embedded
          ? {
              background: "transparent",
              padding: 0,
              minHeight: 0,
              height: "100%",
            }
          : {
              background: "var(--sv-card)",
              border: "1.4px solid white",
              borderRadius: 16,
              padding: narrow ? 12 : 16,
              minHeight: fill ? 0 : plotHeight + 48,
              height: fill ? "100%" : undefined,
              boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.06)",
              display: "flex",
              flexDirection: "column",
            }
      }
    >
      {data.title ? (
        <h3
          className="shrink-0"
          style={{
            fontFamily: "var(--sv-font-ui)",
            fontWeight: 800,
            fontSize: narrow ? 14 : 16,
            color: "var(--sv-ink)",
            marginBottom: 8,
          }}
        >
          {data.title}
        </h3>
      ) : null}

      <div
        className={`flex flex-wrap gap-1.5 sm:gap-2 shrink-0 ${embedded ? "mb-1.5" : "mb-2"}`}
      >
        {legendItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            className="touch-manipulation min-h-8 sm:min-h-0"
            style={{
              fontFamily: "var(--sv-font-ui)",
              fontSize: veryNarrow ? 10 : 11,
              fontWeight: 600,
              padding: veryNarrow ? "3px 6px" : "4px 8px",
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

      {/*
        Fill mode: host is flex-1 and measured → pixel height for Recharts.
        Fixed mode: explicit pixel height (reports / standalone cards).
      */}
      <div
        ref={plotHostRef}
        className={fill ? "w-full min-w-0 flex-1 min-h-0" : "w-full min-w-0 shrink-0"}
        style={
          fill
            ? { width: "100%", minHeight: MIN_FILL_H }
            : { width: "100%", height: plotHeight, minHeight: plotHeight }
        }
      >
        {plotHeight > 0 && (
          <ResponsiveContainer width="100%" height={plotHeight} debounce={50}>
            <LineChart
              data={data.chartData}
              margin={{
                top: narrow ? 10 : 16,
                right: showCosts ? (narrow ? 28 : 36) : narrow ? 4 : 8,
                left: veryNarrow ? -12 : 0,
                bottom: embedded ? (narrow ? 4 : 8) : narrow ? 10 : 16,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sv-border)" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tickMargin={narrow ? 4 : 8}
                interval={xInterval}
                minTickGap={narrow ? 8 : 12}
                tick={{ fill: "var(--sv-text-muted)", fontSize: tickFs }}
                label={
                  veryNarrow
                    ? undefined
                    : {
                        value: data.xAxis || "Rounds",
                        position: "insideBottom",
                        offset: -6,
                        fill: "var(--sv-text-muted)",
                        fontSize: labelFs,
                      }
                }
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tickMargin={narrow ? 4 : 8}
                width={veryNarrow ? 28 : narrow ? 36 : 44}
                tick={{ fill: "var(--sv-text-muted)", fontSize: tickFs }}
                domain={costsOnLeft ? [0, "auto"] : ["auto", "auto"]}
                label={
                  veryNarrow
                    ? undefined
                    : {
                        value: costsOnLeft ? "Cost ($)" : "Units",
                        angle: -90,
                        position: "insideLeft",
                        fill: "var(--sv-text-muted)",
                        fontSize: labelFs,
                      }
                }
              />
              {showCosts && !costsOnLeft && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={narrow ? 4 : 8}
                  width={narrow ? 36 : 48}
                  tick={{ fill: "var(--sv-text-muted)", fontSize: tickFs }}
                  domain={[0, "auto"]}
                  label={
                    veryNarrow
                      ? undefined
                      : {
                          value: "Cost",
                          angle: 90,
                          position: "insideRight",
                          fill: "var(--sv-text-muted)",
                          fontSize: labelFs,
                        }
                  }
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
                  fontSize: narrow ? 12 : 13,
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
                  isAnimationActive={false}
                  dot={(props) => {
                    const { key, ...rest } = props as {
                      key?: string;
                      cx?: number;
                      cy?: number;
                      payload?: { name?: string };
                      index?: number;
                    };
                    return (
                      <Dot
                        key={key ?? `orders-${rest.payload?.name ?? rest.index}`}
                        r={narrow ? 3 : 4}
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
                  isAnimationActive={false}
                  dot={(props) => {
                    const { key, ...rest } = props as {
                      key?: string;
                      cx?: number;
                      cy?: number;
                      payload?: { name?: string };
                      index?: number;
                    };
                    return (
                      <Dot
                        key={key ?? `demand-${rest.payload?.name ?? rest.index}`}
                        r={narrow ? 3 : 4}
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
                  isAnimationActive={false}
                  dot={(props) => {
                    const { key, ...rest } = props as {
                      key?: string;
                      cx?: number;
                      cy?: number;
                      payload?: { name?: string };
                      index?: number;
                    };
                    return (
                      <Dot
                        key={key ?? `delivery-${rest.payload?.name ?? rest.index}`}
                        r={narrow ? 3 : 4}
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
                  isAnimationActive={false}
                  dot={(props) => {
                    const { key, ...rest } = props as {
                      key?: string;
                      cx?: number;
                      cy?: number;
                      payload?: { name?: string };
                      index?: number;
                    };
                    return (
                      <Dot
                        key={key ?? `stock-${rest.payload?.name ?? rest.index}`}
                        r={narrow ? 3 : 4}
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
                  isAnimationActive={false}
                  dot={(props) => {
                    const { key, ...rest } = props as {
                      key?: string;
                      cx?: number;
                      cy?: number;
                      payload?: { name?: string };
                      index?: number;
                    };
                    return (
                      <Dot
                        key={key ?? `backlog-${rest.payload?.name ?? rest.index}`}
                        r={narrow ? 3 : 4}
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
                    isAnimationActive={false}
                    dot={(props) => {
                      const { key, ...rest } = props as {
                        key?: string;
                        cx?: number;
                        cy?: number;
                        payload?: { name?: string };
                        index?: number;
                      };
                      return (
                        <Dot
                          key={key ?? `cost-${rest.payload?.name ?? rest.index}`}
                          r={narrow ? 3 : 4}
                          cx={rest.cx}
                          cy={rest.cy}
                          fill="var(--sv-teal-mid)"
                          stroke="var(--sv-teal-mid)"
                        />
                      );
                    }}
                  >
                    {!narrow && (
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
                    )}
                  </Line>
                );
              })()}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
