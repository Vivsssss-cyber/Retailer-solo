"use client";

import { useEffect, useState } from "react";
import { FO, GameButton, cardStyle } from "@/components/cyan";
import { AdminShell, AdminSection, StatTile } from "@/components/admin/AdminShell";
import {
  clearMockGameData,
  lockAdmin,
  readMockStoreStats,
} from "@/lib/adminConfigStore";

interface HeatRow {
  heat_id: string;
  access_code: string;
  created_at: string;
  players: number;
  config_id: string;
  version: number;
}

interface AttemptRow {
  attempt_id: string;
  player_name: string;
  heat_id: string;
  status: string;
  round: number;
  cost: number;
  started_at: string;
}

export default function AdminDataPage() {
  const [stats, setStats] = useState(readMockStoreStats());
  const [heats, setHeats] = useState<HeatRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);

  const refresh = () => {
    setStats(readMockStoreStats());
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("retailer-challenge-v1");
      if (!raw) {
        setHeats([]);
        setAttempts([]);
        return;
      }
      const store = JSON.parse(raw) as {
        heats: Record<
          string,
          {
            heat_id: string;
            access_code: string;
            created_at: string;
            attempt_ids: string[];
            configuration: { configuration_id: string; configuration_version: number };
          }
        >;
        attempts: Record<
          string,
          {
            attempt_id: string;
            player_name: string;
            heat_id: string;
            status: string;
            current_round: number;
            cumulative_cost: number;
            started_at: string;
          }
        >;
      };
      setHeats(
        Object.values(store.heats ?? {}).map((h) => ({
          heat_id: h.heat_id,
          access_code: h.access_code,
          created_at: h.created_at,
          players: h.attempt_ids?.length ?? 0,
          config_id: h.configuration?.configuration_id ?? "—",
          version: h.configuration?.configuration_version ?? 0,
        })),
      );
      setAttempts(
        Object.values(store.attempts ?? {}).map((a) => ({
          attempt_id: a.attempt_id,
          player_name: a.player_name,
          heat_id: a.heat_id,
          status: a.status,
          round: a.current_round,
          cost: a.cumulative_cost,
          started_at: a.started_at,
        })),
      );
    } catch {
      setHeats([]);
      setAttempts([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminShell
      title="Sessions & data"
      subtitle="Inspect mock heats and attempts stored in this browser."
      actions={
        <>
          <GameButton type="button" size="sm" variant="secondary" onClick={refresh}>
            Refresh
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              lockAdmin();
              window.location.href = "/admin";
            }}
          >
            Lock admin
          </GameButton>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Heats" value={stats.heats} />
        <StatTile label="Attempts" value={stats.attempts} />
        <StatTile label="Playing" value={stats.playing} />
        <StatTile label="Completed" value={stats.completed} />
      </div>

      <AdminSection title="Heats">
        {heats.length === 0 ? (
          <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-muted)" }}>
            No heats yet. Start a solo or multiplayer game from the home page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: FO, fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--sv-text-muted)", textAlign: "left" }}>
                  {["Code", "Players", "Config", "Created"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heats.map((h) => (
                  <tr key={h.heat_id} style={{ borderTop: "1px solid var(--sv-border)", color: "var(--sv-ink)" }}>
                    <td className="sv-tabular" style={{ padding: "8px", fontWeight: 700 }}>
                      {h.access_code}
                    </td>
                    <td className="sv-tabular" style={{ padding: "8px" }}>
                      {h.players}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {h.config_id} v{h.version}
                    </td>
                    <td className="sv-tabular" style={{ padding: "8px" }}>
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Attempts">
        {attempts.length === 0 ? (
          <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-muted)" }}>
            No attempts yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: FO, fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--sv-text-muted)", textAlign: "left" }}>
                  {["Player", "Status", "Round", "Cost", "Started"].map((h) => (
                    <th key={h} style={{ padding: "6px 8px", fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts
                  .slice()
                  .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))
                  .map((a) => (
                    <tr key={a.attempt_id} style={{ borderTop: "1px solid var(--sv-border)", color: "var(--sv-ink)" }}>
                      <td style={{ padding: "8px", fontWeight: 700 }}>{a.player_name}</td>
                      <td style={{ padding: "8px" }}>{a.status}</td>
                      <td className="sv-tabular" style={{ padding: "8px" }}>
                        {a.round}
                      </td>
                      <td className="sv-tabular" style={{ padding: "8px" }}>
                        ${a.cost.toLocaleString()}
                      </td>
                      <td className="sv-tabular" style={{ padding: "8px" }}>
                        {new Date(a.started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: "var(--sv-ink)", marginBottom: 8 }}>
          Danger zone
        </h3>
        <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-secondary)", marginBottom: 12 }}>
          Clears all mock heats and attempts from this browser. Does not reset the admin game
          configuration.
        </p>
        <GameButton
          type="button"
          variant="danger"
          size="sm"
          onClick={() => {
            if (!confirm("Delete all local heats and attempts?")) return;
            clearMockGameData();
            refresh();
          }}
        >
          Clear all session data
        </GameButton>
      </div>
    </AdminShell>
  );
}
