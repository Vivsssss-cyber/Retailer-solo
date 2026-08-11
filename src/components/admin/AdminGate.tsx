"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { FO, GameButton, GridBackground, PageTransition, cardStyle } from "@/components/cyan";
import {
  isAdminUnlocked,
  lockAdmin,
  markAdminUnlocked,
  unlockAdminMock,
} from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";

/** sessionStorage has no change events in-tab; PIN unlock updates local state. */
const subscribeNoop = () => () => {};

export function AdminGate({ children }: { children: ReactNode }) {
  const sessionUnlocked = useSyncExternalStore(
    subscribeNoop,
    isAdminUnlocked,
    () => false,
  );
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [checking, setChecking] = useState(!USE_MOCK);
  const unlocked = sessionUnlocked || localUnlocked;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live: confirm httpOnly session still valid (redeploy wipes in-memory sessions).
  // Mock starts with checking=false (useState(!USE_MOCK)); no sync setState needed.
  useEffect(() => {
    if (USE_MOCK) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await api.getAdminSession();
        if (cancelled) return;
        if (session.authenticated) {
          markAdminUnlocked();
          setLocalUnlocked(true);
        } else {
          lockAdmin();
          setLocalUnlocked(false);
        }
      } catch {
        if (!cancelled) {
          lockAdmin();
          setLocalUnlocked(false);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tryUnlock = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (USE_MOCK) {
        if (!unlockAdminMock(pin)) {
          setError("Enter any non-empty PIN for mock unlock");
          return;
        }
        setLocalUnlocked(true);
        setPin("");
        return;
      }
      await api.adminLogin(pin);
      markAdminUnlocked();
      setLocalUnlocked(true);
      setPin("");
    } catch (e) {
      const { message } = parseApiFailure(e);
      setError(
        message ||
          "Incorrect PIN. Use the ADMIN_PIN set on the server (Railway env), not a demo default.",
      );
    } finally {
      setBusy(false);
    }
  }, [pin]);

  if (checking) {
    return (
      <GridBackground>
        <PageTransition>
          <main className="max-w-md mx-auto px-4 py-16">
            <div style={{ ...cardStyle, padding: 28 }}>
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 13,
                  color: "var(--sv-text-secondary)",
                }}
              >
                Checking admin session…
              </p>
            </div>
          </main>
        </PageTransition>
      </GridBackground>
    );
  }

  if (!unlocked) {
    return (
      <GridBackground>
        <PageTransition>
          <main className="max-w-md mx-auto px-4 py-16">
            <div style={{ ...cardStyle, padding: 28 }}>
              <h1
                style={{
                  fontFamily: FO,
                  fontWeight: 800,
                  fontSize: 22,
                  color: "var(--sv-ink)",
                  marginBottom: 8,
                }}
              >
                Admin access
              </h1>
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 13,
                  color: "var(--sv-text-secondary)",
                  marginBottom: 20,
                  lineHeight: 1.45,
                }}
              >
                Enter the admin PIN to manage groups, game numbers, and session data.
                {USE_MOCK
                  ? " Mock mode: any non-empty PIN unlocks this browser only."
                  : " Live mode: use the ADMIN_PIN from the server environment (e.g. Railway). After a redeploy you must unlock again."}
              </p>
              <input
                type="password"
                value={pin}
                autoComplete="current-password"
                disabled={busy}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void tryUnlock();
                }}
                placeholder="Admin PIN"
                style={{
                  fontFamily: FO,
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1.4px solid white",
                  background: "rgba(255,255,255,0.8)",
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              />
              {error && (
                <p
                  style={{
                    fontFamily: FO,
                    fontSize: 12,
                    color: "var(--sv-negative)",
                    marginBottom: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {error}
                </p>
              )}
              <GameButton
                type="button"
                style={{ width: "100%" }}
                disabled={busy || !pin.trim()}
                onClick={() => void tryUnlock()}
              >
                {busy ? "Checking…" : "Unlock admin"}
              </GameButton>
            </div>
          </main>
        </PageTransition>
      </GridBackground>
    );
  }

  return <>{children}</>;
}
