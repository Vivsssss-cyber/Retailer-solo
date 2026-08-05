"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FO, GameButton, cardStyle } from "@/components/cyan";
import {
  BookOpen,
  Package,
  Play,
  Target,
  Trophy,
  TrendingUp,
  Wallet,
} from "@/components/cyan/PixelIcons";
import BoxView from "@/components/game/BoxView";
import GraphicalView from "@/components/game/GraphicalView";
import type { Attempt, LeaderboardRow, PerformanceReport as Report } from "@/engine";

export function PerformanceReportView({
  attempt,
  report,
  heatRank,
  globalRank,
  heatWinnerCost,
  leaderboard = [],
  globalBoard = [],
  onPlayAgain,
}: {
  attempt: Attempt;
  report: Report;
  heatRank: number | null;
  globalRank: number | null;
  heatWinnerCost?: number | null;
  leaderboard?: LeaderboardRow[];
  globalBoard?: LeaderboardRow[];
  onPlayAgain: () => void;
}) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const unit = attempt.configuration.timeline_unit || "Round";
  const rounds = attempt.rounds;
  const totalRounds = rounds.length;

  const flowData = rounds.map((r) => ({
    name: `R${r.round}`,
    Inventory: r.ending_inventory,
    Backlog: r.ending_backlog,
    Demand: r.customer_demand,
    Orders: r.placed_order,
    Delivery: r.incoming_delivery,
  }));

  const costData = rounds.map((r) => ({
    name: `R${r.round}`,
    "Total Cost": r.cumulative_cost,
  }));

  const gapToWinner =
    heatWinnerCost != null
      ? Math.max(0, report.final_cumulative_cost - heatWinnerCost)
      : null;

  const onTimeRounds = rounds.filter((r) => r.ending_backlog <= 0).length;
  const onTimePercent =
    totalRounds > 0 ? Math.round((onTimeRounds / totalRounds) * 100) : 100;

  const variability = useMemo(() => {
    const demands = rounds.map((r) => r.customer_demand);
    const orders = rounds.map((r) => r.placed_order);
    return {
      demand: statsBlock(demands),
      orders: statsBlock(orders),
    };
  }, [rounds]);

  const finalBoard = useMemo(() => {
    const finished = leaderboard.filter((r) => r.status === "completed");
    if (finished.length === 0) return leaderboard;
    return [...finished]
      .sort((a, b) => {
        if (a.cumulative_cost !== b.cumulative_cost)
          return a.cumulative_cost - b.cumulative_cost;
        const buA = a.backlog_unit_weeks ?? 0;
        const buB = b.backlog_unit_weeks ?? 0;
        if (buA !== buB) return buA - buB;
        return (a.order_volatility ?? 0) - (b.order_volatility ?? 0);
      })
      .map((r, i) => ({ ...r, position: i + 1 }));
  }, [leaderboard]);

  const leader = finalBoard[0];
  const youRow = finalBoard.find((r) => r.player_name === attempt.player_name);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#eff2f4",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(
        `retailer-challenge-${attempt.player_name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      );
    } catch (e) {
      console.error(e);
      alert("Could not generate PDF. Try again or use browser print.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = () => {
    const header =
      "Round,Demand,Delivery,Order,Inventory,Backlog,InvCost,BacklogCost,RoundCost,Cumulative\n";
    const body = rounds
      .map(
        (r) =>
          `${r.round},${r.customer_demand},${r.incoming_delivery},${r.placed_order},${r.ending_inventory},${r.ending_backlog},${r.inventory_cost},${r.backlog_cost},${r.round_cost},${r.cumulative_cost}`,
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retailer-challenge-${attempt.player_name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-4 sm:space-y-5 pb-12">
      {/* Actions — no-print */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 no-print">
        <GameButton type="button" onClick={onPlayAgain} className="w-full sm:w-auto touch-manipulation">
          Play again
        </GameButton>
        <GameButton
          type="button"
          variant="secondary"
          disabled={exporting}
          onClick={() => void handleDownloadPdf()}
          className="w-full sm:w-auto touch-manipulation"
        >
          {exporting ? "Preparing PDF…" : "Download report PDF"}
        </GameButton>
        <GameButton
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          className="w-full sm:w-auto touch-manipulation"
        >
          Export CSV
        </GameButton>
      </div>

      <div ref={pdfRef} className="space-y-4 sm:space-y-5">
        {/* Hero header — beer game report style */}
        <div
          style={{ ...cardStyle }}
          className="text-center relative p-4 sm:p-7"
        >
          <div
            className="flex items-center justify-center gap-2 mb-4"
            style={{ color: "var(--sv-text)" }}
          >
            <Package size={22} color="var(--sv-teal-mid)" />
            <h1 style={{ fontFamily: FO, fontWeight: 700, fontSize: 18 }}>
              {attempt.configuration.game_name || "Retailer Challenge"}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2 relative w-fit mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/intro/spark.svg"
              alt=""
              className="w-[28px] h-[28px] object-contain absolute -left-10 -top-1"
            />
            <h2
              style={{
                fontFamily: FO,
                fontWeight: 800,
                fontSize: 28,
                color: "var(--sv-ink)",
                letterSpacing: "-0.4px",
              }}
            >
              Congratulations on Completion
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/intro/spark.svg"
              alt=""
              className="w-[28px] h-[28px] object-contain absolute -right-10 -top-1"
            />
          </div>
          <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-secondary)" }}>
            {attempt.player_name} · Retailer · {totalRounds} {unit.toLowerCase()}s
            {attempt.completed_at
              ? ` · Finished ${new Date(attempt.completed_at).toLocaleString()}`
              : ""}
          </p>
          {(heatRank != null || globalRank != null) && (
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {heatRank != null && (
                <RankPill
                  icon={<Trophy size={14} color="var(--sv-teal-mid)" />}
                  label="Heat rank"
                  value={`#${heatRank}`}
                />
              )}
              {globalRank != null && (
                <RankPill
                  icon={<Target size={14} color="var(--sv-teal-mid)" />}
                  label="Global rank"
                  value={`#${globalRank}`}
                />
              )}
              {gapToWinner != null && (
                <RankPill
                  icon={<TrendingUp size={14} color="var(--sv-teal-mid)" />}
                  label="Gap to winner"
                  value={gapToWinner === 0 ? "You lead" : `+$${gapToWinner.toLocaleString()}`}
                />
              )}
            </div>
          )}
        </div>

        {/* Performance KPIs — BoxView like beer game */}
        <div>
          <h3
            style={{
              fontFamily: FO,
              fontWeight: 700,
              fontSize: 18,
              color: "var(--sv-ink)",
              marginBottom: 12,
            }}
          >
            Your Performance
          </h3>
          <BoxView
            data={[
              {
                id: "total-cost",
                title: "Total Costs",
                value: `$ ${report.final_cumulative_cost.toLocaleString()}`,
                icon: "dollar-sign",
              },
              {
                id: "on-time",
                title: "On-time Rounds",
                value: `${onTimePercent}%`,
                subtext: `${onTimeRounds}/${totalRounds}`,
                subtextColor: "var(--sv-positive)",
                icon: "trending-up",
              },
              {
                id: "avg-stock",
                title: "Average Stock",
                value: `${report.average_inventory.toFixed(1)} units`,
                icon: "package",
              },
              {
                id: "backlog-weeks",
                title: "Backlog unit-weeks",
                value: `${report.backlog_unit_weeks}`,
                icon: "clock",
              },
            ]}
            gridCols={4}
          />
        </div>

        {/* Heat leaderboard + leader callout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
          <div style={{ ...cardStyle, padding: 20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} color="var(--sv-teal-mid)" />
              <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 16, color: "var(--sv-ink)" }}>
                Final Heat Leaderboard
              </h3>
            </div>
            {leader && (
              <div
                className="mb-4 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2"
                style={{
                  background: "var(--sv-cyan-tint)",
                  border:
                    leader.player_name === attempt.player_name
                      ? "1.6px solid var(--sv-teal-mid)"
                      : "1.4px solid white",
                  boxShadow:
                    leader.player_name === attempt.player_name
                      ? "var(--sv-shadow-3)"
                      : undefined,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: FO,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--sv-teal-mid)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {leader.player_name === attempt.player_name
                      ? "You won the heat"
                      : "Heat leader"}
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{
                      fontFamily: FO,
                      fontWeight: 800,
                      fontSize: 18,
                      color: "var(--sv-ink)",
                    }}
                  >
                    <Trophy size={18} color="var(--sv-teal-mid)" />
                    {leader.player_name}
                    {leader.player_name === attempt.player_name ? " (You)" : ""}
                  </div>
                </div>
                <div
                  className="sv-tabular"
                  style={{ fontFamily: FO, fontWeight: 800, fontSize: 22, color: "var(--sv-teal-mid)" }}
                >
                  ${leader.cumulative_cost.toLocaleString()}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]" style={{ fontFamily: FO, fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--sv-text-muted)", textAlign: "left" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Player</th>
                    <th style={thStyle}>Fill</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(finalBoard.length ? finalBoard : [{ ...emptyRow(attempt, report) }])
                    .slice(0, 10)
                    .map((r) => {
                      const mine = r.player_name === attempt.player_name;
                      const isLeader = r.position === 1;
                      return (
                        <tr
                          key={`${r.position}-${r.player_name}`}
                          style={{
                            background: mine || isLeader ? "var(--sv-cyan-tint)" : "transparent",
                            fontWeight: mine ? 800 : isLeader ? 700 : 500,
                            color: "var(--sv-ink)",
                            borderBottom: "1px solid rgba(200,221,230,0.5)",
                            boxShadow: mine
                              ? "inset 3px 0 0 0 var(--sv-teal-mid)"
                              : undefined,
                          }}
                        >
                          <td className="sv-tabular" style={tdStyle}>
                            {isLeader ? (
                              <span className="inline-flex items-center gap-1">
                                <Trophy size={14} color="var(--sv-teal-mid)" />
                                {r.position}
                              </span>
                            ) : (
                              r.position
                            )}
                          </td>
                          <td style={tdStyle}>
                            {r.player_name}
                            {mine ? " (You)" : ""}
                          </td>
                          <td className="sv-tabular" style={tdStyle}>
                            {r.immediate_fill_rate != null
                              ? `${Math.round(r.immediate_fill_rate * 100)}%`
                              : mine
                                ? `${Math.round(report.immediate_demand_fill_rate * 100)}%`
                                : "—"}
                          </td>
                          <td className="sv-tabular" style={{ ...tdStyle, textAlign: "right" }}>
                            ${r.cumulative_cost.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {youRow && leader && youRow.player_name !== leader.player_name && (
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 12,
                  color: "var(--sv-text-secondary)",
                  marginTop: 12,
                }}
              >
                You finished{" "}
                <strong style={{ color: "var(--sv-ink)" }}>#{youRow.position}</strong>
                {gapToWinner != null && gapToWinner > 0
                  ? ` — $${gapToWinner.toLocaleString()} above the heat leader.`
                  : "."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 15, color: "var(--sv-ink)", marginBottom: 10 }}>
                Service & inventory
              </h3>
              <ul className="space-y-2" style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text)" }}>
                <Li label="Immediate fill rate" value={`${Math.round(report.immediate_demand_fill_rate * 100)}%`} />
                <Li label="Backlog unit-weeks" value={String(report.backlog_unit_weeks)} />
                <Li label="Average inventory" value={report.average_inventory.toFixed(1)} />
                <Li label="Peak inventory" value={String(report.peak_inventory)} />
                <Li label="Peak backlog" value={String(report.peak_backlog)} />
                <Li label="Rounds with backlog" value={String(report.rounds_with_backlog)} />
              </ul>
            </div>
            <div style={{ ...cardStyle, padding: 20 }}>
              <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 15, color: "var(--sv-ink)", marginBottom: 10 }}>
                Decision stability
              </h3>
              <ul className="space-y-2" style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text)" }}>
                <Li label="Average order" value={report.average_order.toFixed(1)} />
                <Li label="Order volatility (σ)" value={report.order_volatility.toFixed(2)} />
                <Li
                  label="Bullwhip ratio"
                  value={report.bullwhip_ratio != null ? report.bullwhip_ratio.toFixed(2) : "n/a"}
                />
                <Li label="Inventory cost" value={`$${report.total_inventory_cost.toLocaleString()}`} />
                <Li label="Backlog cost" value={`$${report.total_backlog_cost.toLocaleString()}`} />
              </ul>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 15, color: "var(--sv-ink)", marginBottom: 8 }}>
            Insight
          </h2>
          <p style={{ fontFamily: FO, fontSize: 14, color: "var(--sv-text)", marginBottom: 8 }}>
            {report.primary_insight}
          </p>
          <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-teal-mid)", fontWeight: 600 }}>
            Next: {report.improvement_direction}
          </p>
        </div>

        {/* Evolution charts — responsive plot host (fills on wide, compact on narrow) */}
        <div className="w-full min-w-0 h-[clamp(220px,42vw,360px)] sm:h-[clamp(260px,36vw,380px)]">
          <GraphicalView
            data={{
              type: "evolution",
              title: "Inventory, backlog, demand, orders & delivery",
              yAxis: ["Inventory", "Backlog", "Demand", "Orders", "Delivery"],
              xAxis: unit + "s",
              chartData: flowData,
              fill: true,
              height: 300,
            }}
          />
        </div>

        <div className="w-full min-w-0 h-[clamp(200px,38vw,320px)] sm:h-[clamp(240px,32vw,340px)]">
          <GraphicalView
            data={{
              type: "evolution",
              title: "Orders vs. Final Demand",
              yAxis: ["Demand", "Orders"],
              xAxis: unit + "s",
              chartData: rounds.map((r) => ({
                name: `R${r.round}`,
                Demand: r.customer_demand,
                Orders: r.placed_order,
              })),
              fill: true,
              height: 280,
            }}
          />
        </div>

        <div className="w-full min-w-0 h-[clamp(200px,36vw,300px)] sm:h-[clamp(220px,30vw,320px)]">
          <GraphicalView
            data={{
              type: "evolution",
              title: "Cumulative cost over time",
              yAxis: ["Total Cost"],
              xAxis: unit + "s",
              chartData: costData,
              fill: true,
              height: 260,
            }}
          />
        </div>

        {/* Variability — beer game style */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: 20,
              color: "var(--sv-ink)",
              letterSpacing: "-0.3px",
              marginBottom: 16,
            }}
          >
            Variability
          </h2>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--sv-border)" }}>
            <table className="w-full" style={{ fontFamily: FO, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.5)" }}>
                  <th style={varTh}>Metric</th>
                  <th style={{ ...varTh, textAlign: "center" }}>Customer Demand</th>
                  <th style={{ ...varTh, textAlign: "center" }}>Your Orders</th>
                </tr>
              </thead>
              <tbody>
                <VarRow label="Biggest" a={variability.demand.max} b={variability.orders.max} />
                <VarRow label="Average" a={variability.demand.avg} b={variability.orders.avg} />
                <VarRow label="Standard Deviation" a={variability.demand.std} b={variability.orders.std} />
                <tr style={{ background: "var(--sv-cyan-tint)" }}>
                  <td style={varTdBold}>Coefficient of Variation</td>
                  <td style={{ ...varTdBold, textAlign: "center" }} className="sv-tabular">
                    {variability.demand.cv}
                  </td>
                  <td style={{ ...varTdBold, textAlign: "center" }} className="sv-tabular">
                    {variability.orders.cv}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost breakdown */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 15, color: "var(--sv-ink)", marginBottom: 10 }}>
            Cost breakdown by {unit.toLowerCase()}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]" style={{ fontFamily: FO, fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--sv-text-muted)", textAlign: "center" }}>
                  {[unit, "Stock", "Backlog", "Inv. cost", "Backlog cost", "Round cost", "Accum."].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 8px",
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: "uppercase",
                          borderBottom: "1px solid var(--sv-border)",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r) => (
                  <tr
                    key={r.round}
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid rgba(200,221,230,0.5)",
                      color: "var(--sv-ink)",
                    }}
                  >
                    <td className="sv-tabular" style={{ padding: "6px 8px", fontWeight: 700 }}>
                      {r.round}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                      {r.ending_inventory}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                      {r.ending_backlog}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                      ${r.inventory_cost.toLocaleString()}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                      ${r.backlog_cost.toLocaleString()}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                      ${r.round_cost.toLocaleString()}
                    </td>
                    <td className="sv-tabular" style={{ padding: "6px 8px", fontWeight: 700 }}>
                      ${r.cumulative_cost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            style={{
              fontFamily: FO,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--sv-ink)",
              marginTop: 12,
            }}
          >
            Total cost:{" "}
            <span style={{ color: "var(--sv-negative)" }}>
              ${report.final_cumulative_cost.toLocaleString()}
            </span>
          </p>
        </div>

        {/* Experience summary — shortened beer-game style */}
        <div style={{ ...cardStyle, padding: 20 }}>
          <h2
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: 20,
              color: "var(--sv-ink)",
              letterSpacing: "-0.3px",
              marginBottom: 8,
            }}
          >
            Experience Summary
          </h2>
          <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-secondary)", marginBottom: 16 }}>
            The journey to a healthy supply chain doesn&apos;t end with the game. The bullwhip
            effect you experienced is a real-world problem — delayed information and large order
            corrections amplify small demand changes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Customer demand",
                body: `Demand averaged ${variability.demand.avg} units with CV ${variability.demand.cv}. Peak demand was ${variability.demand.max} units.`,
              },
              {
                title: "Your ordering",
                body: `You ordered an average of ${variability.orders.avg} units (CV ${variability.orders.cv}). ${
                  report.bullwhip_ratio != null && report.bullwhip_ratio > 1
                    ? `Order variance was ${report.bullwhip_ratio.toFixed(1)}× demand variance.`
                    : "Order variance stayed close to demand variance."
                }`,
              },
              {
                title: "Service level",
                body: `Immediate fill rate ${Math.round(report.immediate_demand_fill_rate * 100)}%. ${report.rounds_with_backlog} of ${totalRounds} rounds carried backlog.`,
              },
              {
                title: "Standing",
                body:
                  heatRank != null
                    ? `Heat rank #${heatRank}${globalRank != null ? ` · Global #${globalRank}` : ""}. Final cost $${report.final_cumulative_cost.toLocaleString()}.`
                    : `Final cost $${report.final_cumulative_cost.toLocaleString()}.`,
              },
            ].map((item) => (
              <div key={item.title} className="space-y-1">
                <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: "var(--sv-ink)" }}>
                  {item.title}
                </h3>
                <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-secondary)" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Global best (if any) */}
        {globalBoard.length > 0 && (
          <div style={{ ...cardStyle, padding: 20 }}>
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} color="var(--sv-teal-mid)" />
              <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 15, color: "var(--sv-ink)" }}>
                Global Best (same config)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]" style={{ fontFamily: FO, fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--sv-text-muted)", textAlign: "left" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Player</th>
                    <th style={thStyle}>Fill</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {globalBoard.slice(0, 5).map((r) => {
                    const mine = r.player_name === attempt.player_name;
                    return (
                      <tr
                        key={`g-${r.position}-${r.player_name}`}
                        style={{
                          background: mine ? "var(--sv-cyan-tint)" : "transparent",
                          fontWeight: mine ? 700 : 500,
                          borderBottom: "1px solid rgba(200,221,230,0.5)",
                          color: "var(--sv-ink)",
                        }}
                      >
                        <td className="sv-tabular" style={tdStyle}>
                          {r.position}
                        </td>
                        <td style={tdStyle}>{r.player_name}</td>
                        <td className="sv-tabular" style={tdStyle}>
                          {r.immediate_fill_rate != null
                            ? `${Math.round(r.immediate_fill_rate * 100)}%`
                            : "—"}
                        </td>
                        <td className="sv-tabular" style={{ ...tdStyle, textAlign: "right" }}>
                          ${r.cumulative_cost.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export tiles — mirror beer game */}
        <div style={{ ...cardStyle, padding: 20 }} className="no-print">
          <h2
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: 18,
              color: "var(--sv-ink)",
              marginBottom: 16,
            }}
          >
            Export &amp; Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ActionTile
              onClick={() => void handleDownloadPdf()}
              icon={<BookOpen size={18} color="var(--sv-teal-mid)" />}
              title="Export Report"
              subtitle="PDF"
            />
            <ActionTile
              onClick={handleExportCsv}
              icon={<Wallet size={18} color="var(--sv-teal-mid)" />}
              title="Export Data"
              subtitle="CSV"
            />
            <ActionTile
              onClick={onPlayAgain}
              icon={<Play size={18} color="var(--sv-teal-mid)" />}
              title="Play Again"
              subtitle="New attempt"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────── */

function statsBlock(values: number[]) {
  if (values.length === 0) return { max: 0, avg: 0, std: 0, cv: 0 };
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = avg === 0 ? 0 : Number((std / avg).toFixed(2));
  return {
    max,
    avg: Math.round(avg * 10) / 10,
    std: Number(std.toFixed(2)),
    cv,
  };
}

function emptyRow(attempt: Attempt, report: Report): LeaderboardRow {
  return {
    position: 1,
    player_name: attempt.player_name,
    completed_round: attempt.rounds.length,
    cumulative_cost: report.final_cumulative_cost,
    status: "completed",
    configuration_id: attempt.configuration.configuration_id,
    configuration_version: attempt.configuration.configuration_version,
    demand_sequence_id: attempt.configuration.demand_sequence_id,
    supply_sequence_id: attempt.configuration.supply_sequence_id,
    total_rounds: attempt.configuration.total_rounds,
    delivery_delay: attempt.configuration.delivery_delay,
    inventory_cost: report.total_inventory_cost,
    backlog_cost: report.total_backlog_cost,
    immediate_fill_rate: report.immediate_demand_fill_rate,
  };
}

const thStyle: CSSProperties = {
  padding: "6px 8px",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const tdStyle: CSSProperties = { padding: "8px" };

const varTh: CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--sv-ink)",
  borderBottom: "1px solid var(--sv-border)",
};

const varTd: CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: "var(--sv-text)",
  borderBottom: "1px solid rgba(200,221,230,0.5)",
};

const varTdBold: CSSProperties = {
  ...varTd,
  fontWeight: 700,
  color: "var(--sv-ink)",
  borderBottom: "none",
};

function VarRow({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <tr>
      <td style={varTd}>{label}</td>
      <td style={{ ...varTd, textAlign: "center" }} className="sv-tabular">
        {a}
      </td>
      <td style={{ ...varTd, textAlign: "center" }} className="sv-tabular">
        {b}
      </td>
    </tr>
  );
}

function RankPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1.4px solid white",
        borderRadius: 9999,
        padding: "6px 14px",
      }}
    >
      {icon}
      <span style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", fontWeight: 600 }}>
        {label}
      </span>
      <span
        className="sv-tabular"
        style={{ fontFamily: FO, fontSize: 14, fontWeight: 800, color: "var(--sv-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

function Li({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-4">
      <span style={{ color: "var(--sv-text-secondary)" }}>{label}</span>
      <span className="sv-tabular" style={{ fontWeight: 700 }}>
        {value}
      </span>
    </li>
  );
}

function ActionTile({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-all active:-translate-y-px"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        padding: 14,
        background: "rgba(255,255,255,0.6)",
        border: "1.4px solid white",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: FO,
        textAlign: "left",
        minHeight: 88,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--sv-teal-mid)";
        e.currentTarget.style.background = "var(--sv-cyan-tint)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "white";
        e.currentTarget.style.background = "rgba(255,255,255,0.6)";
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: "var(--sv-cyan-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sv-ink)" }}>{title}</div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>
    </button>
  );
}
