"use client";

import { useEffect, useState } from "react";
import { FO, GameButton, cardStyle } from "@/components/cyan";
import { AdminShell, AdminSection, StatTile } from "@/components/admin/AdminShell";
import { lockAdmin } from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";

interface HeatRow {
  heat_id: string;
  access_code: string;
  created_at: string;
  players: number;
  config_id: string;
  version: number;
  status?: "open" | "closed";
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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ heats: 0, attempts: 0, completed: 0, playing: 0 });
  const [heats, setHeats] = useState<HeatRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminData();
      setHeats(data.heats);
      setAttempts(data.attempts);
      setStats(data.stats);
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.getAdminData();
        if (!active) return;
        setHeats(data.heats);
        setAttempts(data.attempts);
        setStats(data.stats);
      } catch (e) {
        console.error("Failed to load admin data", e);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleStatus = async (heatId: string) => {
    try {
      await api.toggleHeatStatus(heatId);
      await refresh();
    } catch {
      alert("Failed to toggle heat status");
    }
  };

  const handleDeleteHeat = async (heatId: string, accessCode: string) => {
    if (!confirm(`Are you sure you want to permanently delete heat ${accessCode} and all its attempts?`)) return;
    try {
      await api.deleteHeat(heatId);
      await refresh();
    } catch {
      alert("Failed to delete heat");
    }
  };

  const downloadCsv = () => {
    if (attempts.length === 0) {
      alert("No player data to export");
      return;
    }
    const headers = ["Player Name", "Attempt ID", "Heat ID", "Status", "Current Round", "Cumulative Cost", "Started At"];
    const rows = attempts.map((a) => [
      a.player_name,
      a.attempt_id,
      a.heat_id,
      a.status,
      a.round,
      a.cost,
      new Date(a.started_at).toISOString(),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((val) => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `retailer_challenge_attempts_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminShell
      title="Sessions & data"
      subtitle="Inspect heats and attempts stored in this session."
      actions={
        <>
          <GameButton type="button" size="sm" variant="secondary" onClick={() => void refresh()}>
            Refresh
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              lockAdmin();
              if (!USE_MOCK) void api.adminLogout();
              window.location.href = "/admin";
            }}
          >
            Lock admin
          </GameButton>
        </>
      }
    >
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <p
          style={{
            fontFamily: FO,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--sv-text-muted)",
          }}
        >
          Active source:{" "}
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              background: USE_MOCK ? "rgba(245, 158, 11, 0.15)" : "rgba(20, 184, 166, 0.15)",
              color: USE_MOCK ? "var(--sv-warning, #d97706)" : "var(--sv-teal-mid)",
            }}
          >
            {USE_MOCK ? "local mock" : "live backend API"}
          </span>
        </p>
        <GameButton type="button" variant="secondary" size="sm" onClick={downloadCsv} disabled={attempts.length === 0}>
          Download player data (CSV)
        </GameButton>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile label="Heats" value={stats.heats} />
        <StatTile label="Attempts" value={stats.attempts} />
        <StatTile label="Playing" value={stats.playing} />
        <StatTile label="Completed" value={stats.completed} />
      </div>

      {loading ? (
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)", padding: 20 }}>Loading data…</p>
      ) : (
        <>
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
                      {["Code", "Status", "Players", "Config", "Created", "Actions"].map((h) => (
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
                        <td style={{ padding: "8px" }}>
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(h.heat_id)}
                            style={{
                              fontFamily: FO,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: h.status === "closed" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: h.status === "closed" ? "var(--sv-negative)" : "var(--sv-positive)",
                              border: "1px solid transparent",
                              cursor: "pointer",
                            }}
                            title="Click to toggle status"
                          >
                            {h.status ?? "open"}
                          </button>
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
                        <td style={{ padding: "8px" }}>
                          <button
                            type="button"
                            onClick={() => void handleDeleteHeat(h.heat_id, h.access_code)}
                            style={{
                              fontFamily: FO,
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--sv-negative)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                          >
                            Delete
                          </button>
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
        </>
      )}

      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: "var(--sv-ink)", marginBottom: 8 }}>
          Danger zone
        </h3>
        <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-secondary)", marginBottom: 12 }}>
          Clears all heats and attempts from the current active source. Does not reset the admin game configuration.
        </p>
        <GameButton
          type="button"
          variant="danger"
          size="sm"
          onClick={async () => {
            if (!confirm("Delete all heats and attempts? (This clears data for the current source)")) return;
            try {
              await api.clearAdminData();
              await refresh();
            } catch {
              alert("Failed to clear data");
            }
          }}
        >
          Clear all session data
        </GameButton>
      </div>
    </AdminShell>
  );
}

