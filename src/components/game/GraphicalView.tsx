"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Dot,
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

/** Round max up to a clean 1–2–5×10^n step (real game ticks: 0, 4, 8… not 3.7). */
function niceCeil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 4;
  const exp = Math.floor(Math.log10(n));
  const base = 10 ** exp;
  const f = n / base;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * base;
}

/**
 * Units (inventory / backlog / demand): non-negative integers, padded top.
 * Cost: always from $0, nice integer ceiling.
 */
function unitDomain(
  [lo, hi]: readonly [number, number],
): [number, number] {
  const rawMax = Math.max(hi, lo, 0);
  const max = niceCeil(Math.max(rawMax * 1.08, 4));
  return [0, max];
}

function costDomain(
  [lo, hi]: readonly [number, number],
): [number, number] {
  void lo;
  const max = niceCeil(Math.max(hi * 1.08, 10));
  return [0, max];
}

/** Whole units — beer-game stock never needs decimals on the axis. */
function formatUnitTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value));
}

/** Compact dollar ticks: $0 · $120 · $1.2k */
function formatCostTick(value: number): string {
  if (!Number.isFinite(value)) return "";
  const n = Math.round(value);
  if (Math.abs(n) >= 1000) {
    const k = n / 1000;
    const s = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, "");
    return `$${s}k`;
  }
  return `$${n.toLocaleString()}`;
}

function isCostSeries(name: string): boolean {
  return name.toLowerCase().includes("cost");
}

/** Legend / tooltip label for series keys. */
function seriesLabel(key: string): string {
  const l = key.toLowerCase();
  if (l === "total cost" || l === "totalcost" || l === "costs") return "Cost";
  if (l === "inventory" || l === "stock") return "Inventory";
  if (l === "backlog") return "Backlog";
  if (l === "demand") return "Demand";
  if (l === "delivery") return "Delivery";
  if (l.includes("order")) return "Orders";
  return key;
}

function formatTooltipValue(value: unknown, name: unknown): [string, string] {
  const label = seriesLabel(String(name ?? ""));
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ["—", label];
  if (isCostSeries(String(name ?? ""))) {
    return [`$${Math.round(n).toLocaleString()}`, label];
  }
  return [String(Math.round(n)), label];
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
          padding: embedded ? 12 : 20,
          minHeight: fill ? MIN_FILL_H : 200,
          height: fill || embedded ? "100%" : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--sv-font-ui)",
          color: "var(--sv-text-muted)",
          fontSize: 13,
          textAlign: "center",
          lineHeight: 1.4,
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
  const dotR = embedded || veryNarrow ? 3 : narrow ? 3.5 : 4;
  // Dense play cards: drop axis titles (they clip) and keep tight but safe gutters.
  // Never use negative margins — they pull ticks outside the SVG and get clipped.
  const showAxisTitles = !embedded && !veryNarrow;
  const chartMargin = embedded
    ? {
        top: 10,
        right: showCosts && !costsOnLeft ? (narrow ? 10 : 14) : 8,
        left: 2,
        bottom: 4,
      }
    : {
        top: narrow ? 14 : 18,
        right: showCosts && !costsOnLeft ? (narrow ? 14 : 20) : narrow ? 10 : 14,
        left: 4,
        bottom: showAxisTitles ? (narrow ? 18 : 22) : narrow ? 8 : 10,
      };
  const yTickWidth = embedded
    ? veryNarrow
      ? 30
      : narrow
        ? 34
        : 38
    : veryNarrow
      ? 32
      : narrow
        ? 40
        : 48;
  const yRightWidth = narrow ? 44 : 56;

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
    return {
      key,
      label: seriesLabel(key),
      color,
      enabled: isMetricEnabled(key),
    };
  });

  return (
    <div
      className={[
        "sv-chart",
        fill || embedded ? "h-full min-h-0 flex flex-col w-full min-w-0" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        embedded
          ? {
              background: "transparent",
              padding: 0,
              minHeight: 0,
              height: "100%",
              overflow: "visible",
            }
          : {
              background: "var(--sv-card)",
              border: "1.4px solid white",
              borderRadius: 16,
              padding: narrow ? 14 : 18,
              minHeight: fill ? 0 : plotHeight + 56,
              height: fill ? "100%" : undefined,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.75), 0 4px 14px rgba(0, 44, 51, 0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
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
            marginBottom: 10,
            letterSpacing: "-0.02em",
          }}
        >
          {data.title}
        </h3>
      ) : null}

      <div
        className={`flex flex-wrap gap-1.5 sm:gap-2 shrink-0 ${embedded ? "mb-2" : "mb-2.5"}`}
      >
        {legendItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            className="sv-press touch-manipulation min-h-8 sm:min-h-0"
            style={{
              fontFamily: "var(--sv-font-ui)",
              fontSize: veryNarrow ? 10 : 11,
              fontWeight: 600,
              padding: veryNarrow ? "4px 8px" : "5px 10px",
              borderRadius: 9999,
              border: "1px solid var(--sv-border)",
              background: item.enabled
                ? "var(--sv-cyan-tint)"
                : "color-mix(in srgb, white 60%, transparent)",
              color: item.enabled ? "var(--sv-ink)" : "var(--sv-text-muted)",
              opacity: item.enabled ? 1 : 0.55,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {/* Cyan-graphs legend tick — vertical accent, not a floating dot */}
            <span
              aria-hidden
              style={{
                width: 3,
                height: 12,
                borderRadius: 2,
                background: item.color,
                opacity: item.enabled ? 1 : 0.4,
                flexShrink: 0,
              }}
            />
            {item.label}
          </button>
        ))}
      </div>

      {/*
        Fill mode: host is flex-1 and measured → pixel height for Recharts.
        Fixed mode: explicit pixel height (reports / standalone cards).
        overflow:visible so dots / axis ticks are not clipped by the host.
      */}
      <div
        ref={plotHostRef}
        className={[
          "sv-chart-plot",
          fill ? "w-full min-w-0 flex-1 min-h-0" : "w-full min-w-0 shrink-0",
        ].join(" ")}
        style={
          fill
            ? { width: "100%", minHeight: MIN_FILL_H, overflow: "visible" }
            : {
                width: "100%",
                height: plotHeight,
                minHeight: plotHeight,
                overflow: "visible",
              }
        }
      >
        {plotHeight > 0 && (
          <ResponsiveContainer width="100%" height={plotHeight} debounce={50}>
            <LineChart
              data={data.chartData}
              margin={chartMargin}
            >
              <CartesianGrid
                strokeDasharray="1 5"
                stroke="var(--sv-border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tickMargin={embedded ? 6 : narrow ? 6 : 10}
                interval={xInterval}
                minTickGap={narrow ? 10 : 14}
                height={showAxisTitles ? 36 : 22}
                tick={{
                  fill: "var(--sv-text-muted)",
                  fontSize: tickFs,
                  fontFamily: "var(--sv-font-ui)",
                }}
                label={
                  showAxisTitles
                    ? {
                        value: data.xAxis || "Rounds",
                        position: "insideBottom",
                        offset: -2,
                        fill: "var(--sv-text-muted)",
                        fontSize: labelFs,
                        fontFamily: "var(--sv-font-ui)",
                      }
                    : undefined
                }
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                width={yTickWidth}
                tickCount={5}
                tick={{
                  fill: "var(--sv-text-muted)",
                  fontSize: tickFs,
                  fontFamily: "var(--sv-font-ui)",
                }}
                domain={costsOnLeft ? costDomain : unitDomain}
                allowDecimals={false}
                tickFormatter={costsOnLeft ? formatCostTick : formatUnitTick}
                label={
                  showAxisTitles
                    ? {
                        value: costsOnLeft ? "Cost ($)" : "Units",
                        angle: -90,
                        position: "insideLeft",
                        offset: 8,
                        fill: "var(--sv-text-muted)",
                        fontSize: labelFs,
                        fontFamily: "var(--sv-font-ui)",
                      }
                    : undefined
                }
              />
              {showCosts && !costsOnLeft && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={6}
                  width={yRightWidth}
                  tickCount={5}
                  tick={{
                    fill: "var(--sv-text-muted)",
                    fontSize: tickFs,
                    fontFamily: "var(--sv-font-ui)",
                  }}
                  domain={costDomain}
                  allowDecimals={false}
                  tickFormatter={formatCostTick}
                  label={
                    showAxisTitles
                      ? {
                          value: "Cost",
                          angle: 90,
                          position: "insideRight",
                          offset: 8,
                          fill: "var(--sv-text-muted)",
                          fontSize: labelFs,
                          fontFamily: "var(--sv-font-ui)",
                        }
                      : undefined
                  }
                />
              )}
              <Tooltip
                cursor={{
                  stroke: "var(--sv-border)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                formatter={formatTooltipValue}
                labelFormatter={(label) => String(label)}
                contentStyle={{
                  backgroundColor:
                    "color-mix(in srgb, var(--sv-card-solid) 96%, transparent)",
                  border: "1px solid var(--sv-border)",
                  borderRadius: 12,
                  boxShadow: "0 6px 18px rgba(0, 44, 51, 0.1)",
                  fontFamily: "var(--sv-font-ui)",
                  fontSize: narrow ? 12 : 13,
                  padding: "8px 12px",
                }}
                labelStyle={{
                  color: "var(--sv-ink)",
                  fontWeight: 700,
                  marginBottom: 2,
                }}
                itemStyle={{
                  color: "var(--sv-text)",
                  fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              />

              {showOrders && (
                <Line
                  yAxisId="left"
                  type="monotone"
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
                        r={dotR}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-warning)"
                        stroke="var(--sv-card-solid)"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              )}

              {showDemand && (
                <Line
                  yAxisId="left"
                  type="monotone"
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
                        r={dotR}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-chart-3)"
                        stroke="var(--sv-card-solid)"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              )}

              {showDelivery && (
                <Line
                  yAxisId="left"
                  type="monotone"
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
                        r={dotR}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-positive)"
                        stroke="var(--sv-card-solid)"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              )}

              {showStock && (
                <Line
                  yAxisId="left"
                  type="monotone"
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
                        r={dotR}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-cyan)"
                        stroke="var(--sv-card-solid)"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                />
              )}

              {showBacklog && (
                <Line
                  yAxisId="left"
                  type="monotone"
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
                        r={dotR}
                        cx={rest.cx}
                        cy={rest.cy}
                        fill="var(--sv-ink)"
                        stroke="var(--sv-card-solid)"
                        strokeWidth={1.5}
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
                    type="monotone"
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
                          r={dotR}
                          cx={rest.cx}
                          cy={rest.cy}
                          fill="var(--sv-teal-mid)"
                          stroke="var(--sv-card-solid)"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                  />
                );
              })()}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
