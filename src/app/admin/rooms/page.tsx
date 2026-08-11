"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FO, GameButton } from "@/components/cyan";
import { AdminShell, AdminSection } from "@/components/admin/AdminShell";
import { reauthIfAdminExpired } from "@/components/admin/AdminGate";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";

interface HeatRow {
  heat_id: string;
  access_code: string;
  created_at: string;
  players: number;
  config_id: string;
  version: number;
  status?: "open" | "closed";
}

export default function AdminRoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heats, setHeats] = useState<HeatRow[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminData();
      // Rooms = multiplayer heats (exclude SOLO- practice)
      setHeats(
        data.heats
          .filter((h) => !h.access_code.startsWith("SOLO-"))
          .sort(
            (a, b) =>
              Date.parse(b.created_at) - Date.parse(a.created_at),
          ),
      );
    } catch (e) {
      if (await reauthIfAdminExpired(e)) return;
      setError(parseApiFailure(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer setState past effect body (react-hooks/set-state-in-effect)
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const room = await api.adminCreateRoom({});
      router.push(`/admin/rooms/${encodeURIComponent(room.heat_id)}`);
    } catch (e) {
      if (await reauthIfAdminExpired(e)) return;
      setError(parseApiFailure(e).message);
      setCreating(false);
    }
  };

  return (
    <AdminShell
      title="Groups"
      subtitle="Create a group, share the join link. Players open /join/CODE — you stay here as facilitator."
      actions={
        <>
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create group"}
          </GameButton>
        </>
      }
    >
      <p
        style={{
          fontFamily: FO,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--sv-text-muted)",
          marginBottom: 16,
          lineHeight: 1.45,
        }}
      >
        Create a group, then share the access code or join link with players.
        Multi-device play needs live mode (
        <code>NEXT_PUBLIC_USE_MOCK=false</code>), same origin, and a single server
        instance with persistent disk.
        {USE_MOCK
          ? " You are currently in mock mode (this browser only)."
          : " Live API mode — admin PIN is verified on the server."}
      </p>

      {error && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 13,
            color: "var(--sv-danger, #b91c1c)",
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      <AdminSection title="Open & recent groups">
        {loading && (
          <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
        )}
        {!loading && heats.length === 0 && (
          <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>
            No groups yet. Create one, then share the join link with your class.
          </p>
        )}
        {!loading && heats.length > 0 && (
          <div className="overflow-x-auto">
            <table
              style={{
                width: "100%",
                fontFamily: FO,
                fontSize: 13,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--sv-text-muted)" }}>
                  <th style={{ padding: "8px 6px" }}>Code</th>
                  <th style={{ padding: "8px 6px" }}>Players</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Created</th>
                  <th style={{ padding: "8px 6px" }} />
                </tr>
              </thead>
              <tbody>
                {heats.map((h) => (
                  <tr
                    key={h.heat_id}
                    style={{ borderTop: "1px solid var(--sv-border)" }}
                  >
                    <td
                      style={{
                        padding: "10px 6px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "var(--sv-teal-mid)",
                      }}
                    >
                      {h.access_code}
                    </td>
                    <td style={{ padding: "10px 6px" }}>{h.players}</td>
                    <td style={{ padding: "10px 6px" }}>{h.status ?? "open"}</td>
                    <td style={{ padding: "10px 6px", color: "var(--sv-text-muted)" }}>
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <Link href={`/admin/rooms/${encodeURIComponent(h.heat_id)}`}>
                        <GameButton type="button" size="sm" variant="outline">
                          Open
                        </GameButton>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </AdminShell>
  );
}
