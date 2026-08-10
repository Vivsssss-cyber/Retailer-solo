"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FO,
  GameButton,
  GridBackground,
  PageTransition,
  GlassCard,
} from "@/components/cyan";
import { useAttemptStore } from "@/store/useAttemptStore";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";
import type { HeatSummary } from "@/services/types";
import { readPlayerProfile, writePlayerProfile } from "@/lib/playerProfile";
import { normalizeHeatKey } from "@/lib/heatKey";

/**
 * Player join entry: /join/ABC123 → optional name → practice attempt → /play/[id].
 * Name can be skipped (defaults to "Player"). Phase 1: practice joins only.
 */
export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = String(params.code ?? "");
  const code = normalizeHeatKey(decodeURIComponent(rawCode));

  const { joinHeat, submitting, error: storeError, reset } = useAttemptStore();

  const [heat, setHeat] = useState<HeatSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const loadHeat = useCallback(async () => {
    if (!code) {
      setLoadError("Missing group code.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const summary = await api.getHeat(code);
      setHeat(summary);
      if (summary.status === "closed") {
        setLoadError("This group is closed. Ask your facilitator for a new link.");
      } else if (summary.attempt_count >= summary.max_players) {
        setLoadError(
          `This group is full (${summary.max_players} players). Ask for a new group.`,
        );
      }
    } catch (e) {
      setHeat(null);
      setLoadError(parseApiFailure(e).message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    // Defer setState past effect body (react-hooks/set-state-in-effect)
    const t = window.setTimeout(() => {
      reset();
      const profile = readPlayerProfile();
      if (profile.name) setName(profile.name);
      void loadHeat();
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per code
  }, [code]);

  const canJoin =
    !!heat &&
    heat.status === "open" &&
    heat.attempt_count < heat.max_players &&
    !loadError;

  const handleJoin = async () => {
    setLocalError(null);
    const player = name.trim() || "Player";
    writePlayerProfile({ name: player, persona: readPlayerProfile().persona });
    try {
      const attemptId = await joinHeat(code, player, { is_official: false });
      router.push(`/play/${attemptId}`);
    } catch (e) {
      // Race: room closed/full between load and join
      setLocalError(parseApiFailure(e).message);
      void loadHeat();
    }
  };

  const displayError = localError || storeError;

  return (
    <GridBackground>
      <PageTransition>
        <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
          <GlassCard className="p-5 w-full max-w-md">
            <p
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sv-teal-mid)",
                marginBottom: 6,
              }}
            >
              Join group
            </p>
            <h1
              style={{
                fontFamily: FO,
                fontWeight: 800,
                fontSize: 24,
                color: "var(--sv-ink)",
                marginBottom: 8,
                letterSpacing: "0.12em",
              }}
            >
              {code || "—"}
            </h1>

            {USE_MOCK && (
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--sv-warning, #b45309)",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 16,
                  lineHeight: 1.4,
                }}
              >
                Mock mode: groups only exist in this browser. Classroom play needs{" "}
                <code style={{ fontSize: 11 }}>NEXT_PUBLIC_USE_MOCK=false</code>.
              </p>
            )}

            {loading && (
              <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>
                Checking group…
              </p>
            )}

            {!loading && heat && !loadError && (
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 14,
                  color: "var(--sv-text-secondary)",
                  marginBottom: 16,
                  lineHeight: 1.45,
                }}
              >
                {heat.configuration.game_name}
                {" · "}
                {heat.attempt_count}/{heat.max_players} players
              </p>
            )}

            {(loadError || displayError) && (
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 13,
                  color: "var(--sv-danger, #b91c1c)",
                  marginBottom: 16,
                  lineHeight: 1.4,
                }}
              >
                {loadError || displayError}
              </p>
            )}

            {canJoin && (
              <>
                <p
                  style={{
                    fontFamily: FO,
                    fontSize: 13,
                    color: "var(--sv-text-secondary)",
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  You&apos;re in the group. Add a display name now or skip and join as
                  Player.
                </p>
                <label
                  htmlFor="join-name"
                  style={{
                    fontFamily: FO,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--sv-text-muted)",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Display name (optional)
                </label>
                <input
                  id="join-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Skip for now — e.g. Alex"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleJoin();
                  }}
                  style={{
                    width: "100%",
                    fontFamily: FO,
                    fontSize: 16,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "2px solid var(--sv-border)",
                    background: "rgba(255,255,255,0.8)",
                    color: "var(--sv-ink)",
                    marginBottom: 20,
                    outline: "none",
                  }}
                />
                <GameButton
                  size="lg"
                  style={{ width: "100%" }}
                  disabled={submitting}
                  onClick={() => void handleJoin()}
                >
                  {submitting
                    ? "Joining…"
                    : name.trim()
                      ? "Enter the warehouse"
                      : "Join without name"}
                </GameButton>
              </>
            )}

            {!canJoin && !loading && (
              <div className="flex flex-col gap-2 mt-2">
                <GameButton
                  size="md"
                  variant="secondary"
                  style={{ width: "100%" }}
                  onClick={() => void loadHeat()}
                >
                  Try again
                </GameButton>
              </div>
            )}

            <div className="mt-4 text-center">
              <Link
                href="/"
                style={{
                  fontFamily: FO,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--sv-teal-mid)",
                }}
              >
                Back to home
              </Link>
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    </GridBackground>
  );
}
