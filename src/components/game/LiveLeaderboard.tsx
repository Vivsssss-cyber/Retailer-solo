"use client";

import { useState } from "react";
import { FO, TabBar, cardStyle } from "@/components/cyan";
import { Trophy } from "@/components/cyan/PixelIcons";
import type { LeaderboardRow } from "@/engine";

export function LiveLeaderboard({
  live,
  global,
  playerName,
  dense = false,
}: {
  live: LeaderboardRow[];
  global: LeaderboardRow[];
  playerName: string;
  dense?: boolean;
}) {
  const [tab, setTab] = useState<"live" | "global">("live");
  const allFinished =
    live.length > 0 && live.every((r) => r.status === "completed");
  /** PRD: once all players finish, heat board becomes final ranking (cost-first). */
  const heatRows = allFinished
    ? [...live]
        .sort((a, b) => {
          if (a.cumulative_cost !== b.cumulative_cost)
            return a.cumulative_cost - b.cumulative_cost;
          const buA = a.backlog_unit_weeks ?? 0;
          const buB = b.backlog_unit_weeks ?? 0;
          if (buA !== buB) return buA - buB;
          const ovA = a.order_volatility ?? 0;
          const ovB = b.order_volatility ?? 0;
          if (ovA !== ovB) return ovA - ovB;
          const ta = a.completed_at ? Date.parse(a.completed_at) : 0;
          const tb = b.completed_at ? Date.parse(b.completed_at) : 0;
          return ta - tb;
        })
        .map((r, i) => ({ ...r, position: i + 1 }))
    : live;
  const rows = tab === "live" ? heatRows : global;

  const myLive = heatRows.find((r) => r.player_name === playerName);
  const iLeadLive =
    !allFinished && myLive != null && myLive.position === 1 && heatRows.length > 1;
  const iWonFinal =
    allFinished && myLive != null && myLive.position === 1 && heatRows.length > 1;

  // Solo / single entry: still show compact board but no fake race copy
  const multiplayer = heatRows.length > 1;

  return (
    <div
      style={{
        ...cardStyle,
        padding: dense ? 8 : 12,
        height: "100%",
        minHeight: dense ? 0 : 240,
        display: "flex",
        flexDirection: "column",
      }}
      className="min-h-0"
    >
      <div
        className={`flex items-center justify-between gap-2 ${dense ? "mb-1" : "mb-2"} flex-wrap shrink-0`}
      >
        <div className="flex items-center gap-1.5">
          <Trophy size={14} color="var(--sv-teal-mid)" />
          <span
            style={{
              fontFamily: FO,
              fontWeight: 700,
              fontSize: dense ? 12 : 13,
              color: "var(--sv-ink)",
            }}
          >
            Leaderboard
          </span>
        </div>
        <TabBar
          tabs={[
            { id: "live", label: allFinished ? "Final" : "Live" },
            { id: "global", label: "Global" },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as "live" | "global")}
        />
      </div>

      {tab === "live" && multiplayer && (iLeadLive || iWonFinal) && (
        <div
          className="sv-lead-banner shrink-0 mb-1.5 rounded-lg px-2 py-1.5 flex items-center gap-2"
          style={{
            background: "var(--sv-cyan-tint)",
            border: "1.4px solid var(--sv-teal-mid)",
          }}
          role="status"
        >
          <Trophy size={14} color="var(--sv-teal-mid)" />
          <span
            style={{
              fontFamily: FO,
              fontSize: dense ? 11 : 12,
              fontWeight: 800,
              color: "var(--sv-teal-mid)",
            }}
          >
            {iWonFinal ? "You won the heat!" : "You’re #1 — keep leading"}
          </span>
        </div>
      )}

      {!dense && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 10,
            color: "var(--sv-text-muted)",
            marginBottom: 8,
          }}
        >
          {tab === "global"
            ? "Completed attempts only · same configuration."
            : allFinished
              ? "Final heat — cost, then backlog-weeks, then volatility."
              : multiplayer
                ? "Live race — progress first, cost second."
                : "Solo run — invite others or join a heat for a live race."}
        </p>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full" style={{ fontFamily: FO, fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--sv-text-muted)", textAlign: "left" }}>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>#</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Player</th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>
                {tab === "global" ? "Fill" : "Round"}
              </th>
              <th style={{ padding: "4px 6px", fontWeight: 600 }}>Status</th>
              <th
                style={{
                  padding: "4px 6px",
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 12,
                    color: "var(--sv-text-muted)",
                    textAlign: "center",
                  }}
                >
                  No entries yet
                </td>
              </tr>
            )}
            {rows.slice(0, 8).map((r) => {
              const mine = r.player_name === playerName;
              const finished = r.status === "completed";
              const isLeader = r.position === 1 && rows.length > 1;
              return (
                <tr
                  key={`${r.position}-${r.player_name}-${r.completed_at ?? r.completed_round}`}
                  className={mine || isLeader ? undefined : "sv-table-row"}
                  style={{
                    background: mine || isLeader ? "var(--sv-cyan-tint)" : "transparent",
                    fontWeight: mine ? 800 : isLeader ? 700 : 500,
                    color: "var(--sv-ink)",
                    boxShadow: mine
                      ? "inset 3px 0 0 0 var(--sv-teal-mid)"
                      : undefined,
                    transition: "background-color 160ms ease",
                  }}
                >
                  <td className="sv-tabular" style={{ padding: "6px" }}>
                    {isLeader ? (
                      <span
                        className="inline-flex items-center gap-0.5"
                        title="Heat leader"
                      >
                        <Trophy size={12} color="var(--sv-teal-mid)" />
                        <span key={r.position} className="sv-value-tick">
                          {r.position}
                        </span>
                      </span>
                    ) : (
                      <span key={r.position} className="sv-value-tick">
                        {r.position}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "6px" }}>
                    {r.player_name}
                    {mine ? " (You)" : ""}
                  </td>
                  <td className="sv-tabular" style={{ padding: "6px" }}>
                    {tab === "global"
                      ? r.immediate_fill_rate != null
                        ? `${Math.round(r.immediate_fill_rate * 100)}%`
                        : "—"
                      : r.completed_round}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      fontSize: 11,
                      color: finished
                        ? "var(--sv-positive)"
                        : "var(--sv-teal-mid)",
                    }}
                  >
                    {finished ? "Finished" : "Playing"}
                  </td>
                  <td
                    className="sv-tabular"
                    style={{ padding: "6px", textAlign: "right" }}
                  >
                    <span
                      key={r.cumulative_cost}
                      className="sv-value-tick"
                    >
                      ${r.cumulative_cost.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
