"use client";

import { FO, cardStyle } from "@/components/cyan";
import type { RoundRecord } from "@/engine";

export function RoundHistoryTable({
  rounds,
  unit = "Round",
  dense = false,
}: {
  rounds: RoundRecord[];
  unit?: string;
  dense?: boolean;
}) {
  if (rounds.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: dense ? 8 : 12, height: "100%" }}>
        <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: dense ? 12 : 13, color: "var(--sv-ink)" }}>
          Game progress
        </h3>
        <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 8 }}>
          Confirm your first order to start the history table.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ ...cardStyle, padding: dense ? 8 : 12, height: "100%", minHeight: 0 }}
      className="flex flex-col min-h-0"
    >
      <h3
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: dense ? 12 : 13,
          color: "var(--sv-ink)",
          marginBottom: dense ? 6 : 10,
        }}
        className="shrink-0"
      >
        Game progress
      </h3>
      <div
        className={`overflow-x-auto overflow-y-auto min-h-0 flex-1 ${
          dense ? "max-h-[132px]" : "max-h-[220px]"
        }`}
      >
        <table className="w-full" style={{ fontFamily: FO, fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--sv-text-muted)", textAlign: "center" }}>
              {[
                unit,
                "Stock",
                "Incoming",
                "Backlog",
                "Demand",
                "Your order",
                "Round cost",
                "Accum. cost",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 8px",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: "1px solid var(--sv-border)",
                    position: "sticky",
                    top: 0,
                    background: "rgba(255,255,255,0.92)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr
                key={r.round}
                style={{
                  textAlign: "center",
                  color: "var(--sv-ink)",
                  borderBottom: "1px solid rgba(200,221,230,0.5)",
                }}
              >
                <td className="sv-tabular" style={{ padding: "6px 8px", fontWeight: 700 }}>
                  {r.round}
                </td>
                <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                  {r.ending_inventory}
                </td>
                <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                  {r.incoming_delivery}
                </td>
                <td
                  className="sv-tabular"
                  style={{
                    padding: "6px 8px",
                    color: r.ending_backlog > 0 ? "var(--sv-negative)" : "var(--sv-ink)",
                    fontWeight: r.ending_backlog > 0 ? 700 : 500,
                  }}
                >
                  {r.ending_backlog}
                </td>
                <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                  {r.customer_demand}
                </td>
                <td className="sv-tabular" style={{ padding: "6px 8px" }}>
                  {r.placed_order}
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
    </div>
  );
}
