"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FO, GameButton, GridBackground, PageTransition, cardStyle } from "@/components/cyan";
import {
  isAdminUnlocked,
  lockAdmin,
  markAdminUnlocked,
  MOCK_ADMIN_PIN,
} from "@/lib/adminConfigStore";
import { api, USE_MOCK, ApiRequestError } from "@/services/api";

export function AdminGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (USE_MOCK) {
          if (!cancelled) setUnlocked(isAdminUnlocked());
          return;
        }
        const session = await api.getAdminSession();
        if (cancelled) return;
        if (session.authenticated) {
          markAdminUnlocked();
          setUnlocked(true);
        } else {
          lockAdmin();
          setUnlocked(false);
        }
      } catch {
        if (!cancelled) {
          setUnlocked(isAdminUnlocked());
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await api.adminLogin(pin);
      markAdminUnlocked();
      setUnlocked(true);
      setPin("");
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Incorrect PIN";
      setError(message);
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
                }}
              >
                Enter the admin PIN to manage game numbers, demand sequences, and session data.
                {USE_MOCK ? (
                  <>
                    {" "}
                    (Offline mock — default PIN:{" "}
                    <code style={{ fontWeight: 700 }}>{MOCK_ADMIN_PIN}</code>)
                  </>
                ) : (
                  <> Live mode uses a server-side PIN and a secure session cookie.</>
                )}
              </p>
              <input
                type="password"
                value={pin}
                autoComplete="current-password"
                disabled={busy}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void submit();
                }}
                placeholder="PIN"
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
                  }}
                >
                  {error}
                </p>
              )}
              <GameButton
                type="button"
                style={{ width: "100%" }}
                disabled={busy || !pin.trim()}
                onClick={() => void submit()}
              >
                {busy ? "Unlocking…" : "Unlock admin"}
              </GameButton>
            </div>
          </main>
        </PageTransition>
      </GridBackground>
    );
  }

  return <>{children}</>;
}
