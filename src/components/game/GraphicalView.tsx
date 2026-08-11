"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface EvolutionChartData {
  title?: string;
  yAxis?: string[];
  xAxis?: string;
  type?: "evolution";
  chartData?: Record<string, string | number>[];
  /** Chart plot height in px (reports / standalone cards). */
  height?: number | string;
  /** Nest inside a card that already provides chrome — drop our own card. */
  embedded?: boolean;
  /** Fill the parent's height instead of using `height`. Defaults to `embedded`. */
  fill?: boolean;
}

interface GraphicalViewProps {
  data: EvolutionChartData;
}

const FALLBACK_PLOT_H = 180;
/**
 * Floor for the plot area when filling a parent. Kept low on purpose: the card
 * paints with `overflow: visible` (dots/ticks must not shear), so a floor taller
 * than the space the parent hands us leaks the x-axis outside the card.
 */
const MIN_FILL_H = 96;

/** Default-on series for multi-metric flow charts. */
const DEFAULT_ON = new Set(["inventory", "stock", "backlog", "demand"]);

/** One plotted metric: raw data key + css-safe slug used for shadcn config/colors. */
interface Series {
  /** Key as declared by the caller (matches a field in chartData rows). */
  dataKey: string;
  /** CSS-safe id — drives `--color-<slug>` from ChartStyle and tooltip lookups. */
  slug: string;
  label: string;
  color: string;
  cost: boolean;
}

function slugify(key: string): string {
  return (
    key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "series"
  );
}

function isCostKey(key: string): boolean {
  return key.toLowerCase().includes("cost");
}

/** Legend / tooltip label for series keys. */
function seriesLabel(key: string): string {
  const l = key.toLowerCase();
  if (l === "round cost") return "Round cost";
  if (l === "total cost" || l === "totalcost" || l === "costs" || l === "cumulative cost")
    return "Total cost";
  if (l === "inventory" || l === "stock") return "Inventory";
  if (l === "backlog") return "Backlog";
  if (l === "demand") return "Demand";
  if (l === "delivery") return "Delivery";
  if (l.includes("order")) return "Orders";
  return key;
}

function seriesColor(key: string): string {
  const l = key.toLowerCase();
  if (l === "backlog") return "var(--sv-ink)";
  if (l.includes("order")) return "var(--sv-warning)";
  if (l === "demand") return "var(--sv-chart-3)";
  if (l === "delivery") return "var(--sv-positive)";
  if (l.includes("cost")) return "var(--sv-teal-mid)";
  if (l === "inventory" || l === "stock") return "var(--sv-cyan)";
  return "var(--sv-chart-1)";
}

function buildSeries(yAxis: string[] | undefined): Series[] {
  const used = new Set<string>();
  return (yAxis ?? []).map((dataKey) => {
    let slug = slugify(dataKey);
    while (used.has(slug)) slug = `${slug}-x`;
    used.add(slug);
    return {
      dataKey,
      slug,
      label: seriesLabel(dataKey),
      color: seriesColor(dataKey),
      cost: isCostKey(dataKey),
    };
  });
}

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

/** Units (inventory / backlog / demand): non-negative integers, padded top. */
function unitDomain([lo, hi]: readonly [number, number]): [number, number] {
  const rawMax = Math.max(hi, lo, 0);
  return [0, niceCeil(Math.max(rawMax * 1.08, 4))];
}

/** Cost: always from $0, nice integer ceiling. */
function costDomain([lo, hi]: readonly [number, number]): [number, number] {
  void lo;
  return [0, niceCeil(Math.max(hi * 1.08, 10))];
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

/**
 * Beer Game evolution chart, built on the shadcn `chart` primitives
 * (ChartContainer / ChartTooltip / ChartTooltipContent) over Recharts.
 *
 * Only series declared in `yAxis` are plotted, so a cost-only chart never
 * picks up flow keys that happen to share the same `chartData` rows.
 */
export default function GraphicalView({ data }: GraphicalViewProps) {
  const [disabledMetrics, setDisabledMetrics] = useState<string[]>(() =>
    initialDisabledMetrics(data.yAxis),
  );

  const fill = data.fill ?? Boolean(data.embedded);
  const embedded = Boolean(data.embedded);
  const fixedHeight = resolveFixedHeight(data.height);

  // Width only — ChartContainer owns height. Ticks/margins tighten when narrow.
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      setWidth((prev) => (w > 0 && w !== prev ? w : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allSeries = useMemo(() => buildSeries(data.yAxis), [data.yAxis]);

  const chartConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    for (const s of allSeries) cfg[s.slug] = { label: s.label, color: s.color };
    return cfg;
  }, [allSeries]);

  if (!data?.chartData || data.chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl text-center text-[13px] leading-snug text-muted-foreground"
        style={{
          background: embedded ? "transparent" : "var(--sv-card)",
          border: embedded ? "none" : "1.4px solid white",
          padding: embedded ? 12 : 20,
          minHeight: fill ? MIN_FILL_H : 200,
          height: fill || embedded ? "100%" : undefined,
          fontFamily: "var(--sv-font-ui)",
        }}
      >
        No round data yet — place your first order to build the trend.
      </div>
    );
  }

  const active = allSeries.filter((s) => !disabledMetrics.includes(s.dataKey));
  const costSeries = active.filter((s) => s.cost);
  const unitSeries = active.filter((s) => !s.cost);
  const showCosts = costSeries.length > 0;
  // Cost-only chart → cost owns the left axis (no empty "Units" scale).
  const costsOnLeft = showCosts && unitSeries.length === 0;
  const showRightAxis = showCosts && !costsOnLeft;

  const narrow = width > 0 && width < 420;
  const veryNarrow = width > 0 && width < 320;
  const tickFs = veryNarrow ? 9 : narrow ? 10 : 11;
  const labelFs = veryNarrow ? 10 : 12;
  const pointCount = data.chartData.length;
  const xInterval =
    narrow && pointCount > 8 ? Math.ceil(pointCount / 6) - 1 : pointCount > 14 ? 1 : 0;
  const dotR = embedded || veryNarrow ? 3 : narrow ? 3.5 : 4;
  // Dense play cards: drop axis titles (they clip) and keep tight but safe gutters.
  // Never use negative margins — they pull ticks outside the SVG and get clipped.
  const showAxisTitles = !embedded && !veryNarrow;
  // Rotated Y titles collide with the tick column below ~420px — x title stays.
  const showYAxisTitles = showAxisTitles && !narrow;
  const chartMargin = embedded
    ? { top: 10, right: showRightAxis ? (narrow ? 10 : 14) : 8, left: 2, bottom: 4 }
    : {
        top: narrow ? 14 : 18,
        right: showRightAxis ? (narrow ? 14 : 20) : narrow ? 10 : 14,
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

  const toggle = (key: string) =>
    setDisabledMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const axisTick = {
    fill: "var(--sv-text-muted)",
    fontSize: tickFs,
    fontFamily: "var(--sv-font-ui)",
  };
  const axisLabelStyle = {
    fill: "var(--sv-text-muted)",
    fontSize: labelFs,
    fontFamily: "var(--sv-font-ui)",
  };

  return (
    <div
      className={[
        "sv-chart",
        fill || embedded ? "flex h-full min-h-0 w-full min-w-0 flex-col" : "",
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
              minHeight: fill ? 0 : fixedHeight + 56,
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
          className="shrink-0 tracking-[-0.02em]"
          style={{
            fontFamily: "var(--sv-font-ui)",
            fontWeight: 800,
            fontSize: narrow ? 14 : 16,
            color: "var(--sv-ink)",
            marginBottom: 10,
          }}
        >
          {data.title}
        </h3>
      ) : null}

      {/*
        Interactive legend — shadcn's ChartLegendContent is display-only and
        series toggling is a shipped affordance here, so we keep buttons and
        style them from the same semantic tokens.
      */}
      <div
        className={`flex shrink-0 flex-wrap gap-1.5 sm:gap-2 ${embedded ? "mb-2" : "mb-2.5"}`}
      >
        {allSeries.map((s) => {
          const enabled = !disabledMetrics.includes(s.dataKey);
          return (
            <button
              key={s.dataKey}
              type="button"
              onClick={() => toggle(s.dataKey)}
              aria-pressed={enabled}
              className={[
                "sv-press inline-flex min-h-8 touch-manipulation items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold sm:min-h-0",
                veryNarrow ? "text-[10px]" : "text-[11px]",
                enabled
                  ? "border-border bg-accent text-foreground"
                  : "border-border/60 bg-background/60 text-muted-foreground opacity-60",
              ].join(" ")}
              style={{ fontFamily: "var(--sv-font-ui)" }}
            >
              {/* Cyan-graphs legend tick — vertical accent, not a floating dot */}
              <span
                aria-hidden
                className="h-3 w-[3px] shrink-0 rounded-[2px]"
                style={{ background: s.color, opacity: enabled ? 1 : 0.4 }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      <ChartContainer
        ref={hostRef}
        config={chartConfig}
        className={[
          "aspect-auto w-full min-w-0 overflow-visible",
          fill ? "min-h-0 flex-1" : "shrink-0",
        ].join(" ")}
        style={
          fill
            ? { minHeight: MIN_FILL_H }
            : { height: fixedHeight, minHeight: fixedHeight }
        }
      >
        <LineChart data={data.chartData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="1 5" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tickMargin={embedded || narrow ? 6 : 10}
            interval={xInterval}
            minTickGap={narrow ? 10 : 14}
            height={showAxisTitles ? 36 : 22}
            tick={axisTick}
            label={
              showAxisTitles
                ? {
                    value: data.xAxis || "Rounds",
                    position: "insideBottom",
                    offset: -2,
                    ...axisLabelStyle,
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
            tick={axisTick}
            domain={costsOnLeft ? costDomain : unitDomain}
            allowDecimals={false}
            tickFormatter={costsOnLeft ? formatCostTick : formatUnitTick}
            label={
              showYAxisTitles
                ? {
                    value: costsOnLeft ? "Cost ($)" : "Units",
                    angle: -90,
                    position: "insideLeft",
                    offset: 8,
                    ...axisLabelStyle,
                  }
                : undefined
            }
          />
          {showRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              width={narrow ? 44 : 56}
              tickCount={5}
              tick={axisTick}
              domain={costDomain}
              allowDecimals={false}
              tickFormatter={formatCostTick}
              label={
                showYAxisTitles
                  ? {
                      value: "Cost",
                      angle: 90,
                      position: "insideRight",
                      offset: 8,
                      ...axisLabelStyle,
                    }
                  : undefined
              }
            />
          )}

          <ChartTooltip
            cursor={{ strokeWidth: 1, strokeDasharray: "3 3" }}
            content={
              <ChartTooltipContent
                // "dot" keeps the round label on its own line even for
                // single-series charts (shadcn nests it otherwise, and our
                // custom row would swallow it). We draw our own indicator.
                indicator="dot"
                hideIndicator
                formatter={(value, name) => {
                  const s = allSeries.find((item) => item.slug === name);
                  const n = typeof value === "number" ? value : Number(value);
                  const text = !Number.isFinite(n)
                    ? "—"
                    : s?.cost
                      ? `$${Math.round(n).toLocaleString()}`
                      : String(Math.round(n));
                  return (
                    <>
                      <span
                        aria-hidden
                        className="h-3 w-[3px] shrink-0 self-center rounded-[2px]"
                        style={{ background: s?.color ?? "var(--sv-chart-1)" }}
                      />
                      <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                        <span className="text-muted-foreground">
                          {s?.label ?? String(name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {text}
                        </span>
                      </div>
                    </>
                  );
                }}
              />
            }
          />

          {active.map((s) => (
            <Line
              key={s.slug}
              yAxisId={s.cost && !costsOnLeft ? "right" : "left"}
              name={s.slug}
              type="monotone"
              dataKey={s.dataKey}
              stroke={`var(--color-${s.slug})`}
              strokeWidth={2}
              isAnimationActive={false}
              dot={{
                r: dotR,
                fill: `var(--color-${s.slug})`,
                stroke: "var(--sv-card-solid)",
                strokeWidth: 1.5,
              }}
              activeDot={{ r: dotR + 1.5 }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}
