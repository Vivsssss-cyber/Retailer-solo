"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FO, GameButton } from "@/components/cyan";
import { AdminShell, AdminSection } from "@/components/admin/AdminShell";
import { RoomShareCard } from "@/components/admin/RoomShareCard";
import { api } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";
import type { HeatSummary } from "@/services/types";

export default function AdminRoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const heatId = decodeURIComponent(String(params.heatId ?? ""));
  const [heat, setHeat] = useState<HeatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!heatId) return;
    setError(null);
    try {
      const next = await api.getHeat(heatId);
      setHeat(next);
    } catch (e) {
      setError(parseApiFailure(e).message);
      setHeat(null);
    } finally {
      setLoading(false);
    }
  }, [heatId]);

  useEffect(() => {
    // Defer first load past effect body (react-hooks/set-state-in-effect)
    const boot = window.setTimeout(() => {
      void refresh();
    }, 0);
    const poll = window.setInterval(() => void refresh(), 4000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(poll);
    };
  }, [refresh]);

  const toggleStatus = async () => {
    if (!heat) return;
    setBusy(true);
    try {
      await api.toggleHeatStatus(heat.heat_id);
      await refresh();
    } catch (e) {
      setError(parseApiFailure(e).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!heat) return;
    if (
      !confirm(
        `Delete room ${heat.access_code} and all its attempts? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.deleteHeat(heat.heat_id);
      router.push("/admin/rooms");
    } catch (e) {
      setError(parseApiFailure(e).message);
      setBusy(false);
    }
  };

  return (
    <AdminShell
      title={heat ? `Room ${heat.access_code}` : "Room"}
      subtitle="Share the join link. Player count updates while the room is open."
      actions={
        <>
          <Link href="/admin/rooms">
            <GameButton type="button" size="sm" variant="outline">
              All rooms
            </GameButton>
          </Link>
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void refresh()}
            disabled={loading || busy}
          >
            Refresh
          </GameButton>
        </>
      }
    >
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

      {loading && !heat && (
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
      )}

      {heat && (
        <>
          <AdminSection title="Share with players">
            <RoomShareCard accessCode={heat.access_code} />
          </AdminSection>

          <AdminSection title="Status">
            <div
              className="flex flex-wrap gap-4 items-center"
              style={{ fontFamily: FO, fontSize: 14 }}
            >
              <div>
                <span style={{ color: "var(--sv-text-muted)" }}>Players: </span>
                <strong style={{ color: "var(--sv-ink)" }}>
                  {heat.attempt_count} / {heat.max_players}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--sv-text-muted)" }}>Status: </span>
                <strong style={{ color: "var(--sv-ink)" }}>{heat.status}</strong>
              </div>
              <div>
                <span style={{ color: "var(--sv-text-muted)" }}>Game: </span>
                <strong style={{ color: "var(--sv-ink)" }}>
                  {heat.configuration.game_name}
                </strong>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <GameButton
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void toggleStatus()}
              >
                {heat.status === "open" ? "Close room" : "Reopen room"}
              </GameButton>
              <GameButton
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                Delete room
              </GameButton>
            </div>
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                color: "var(--sv-text-muted)",
                marginTop: 12,
                lineHeight: 1.4,
              }}
            >
              Closing stops new joins. Players already in progress can finish.
              Player names are not listed here in Phase 1 (count only).
            </p>
          </AdminSection>
        </>
      )}
    </AdminShell>
  );
}
