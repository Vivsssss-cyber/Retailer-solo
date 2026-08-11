"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FO, GameButton, GridBackground, PageTransition, cardStyle } from "@/components/cyan";
import {
  isAdminUnlocked,
  lockAdmin,
  markAdminUnlocked,
  unlockAdminMock,
} from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";

/**
 * Live: client sessionStorage is only a UI hint — always re-check the
 * server cookie session so redeploys / expired cookies re-prompt for PIN.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">(
    () => (USE_MOCK && isAdminUnlocked() ? "unlocked" : "checking"),
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lockUi = useCallback(() => {
    lockAdmin();
    setPin("");
    setStatus("locked");
  }, []);

  const unlockUi = useCallback(() => {
    markAdminUnlocked();
    setStatus("unlocked");
  }, []);

  // Validate on mount + when child pages fire "rc-admin-lock"
  useEffect(() => {
    let cancelled = false;

    const onLockEvent = () => {
      lockUi();
    };
    window.addEventListener("rc-admin-lock", onLockEvent);

    void (async () => {
      if (USE_MOCK) {
        if (!cancelled) {
          setStatus(isAdminUnlocked() ? "unlocked" : "locked");
        }
        return;
      }
      try {
        const { authenticated } = await api.adminSession();
        if (cancelled) return;
        if (authenticated) {
          markAdminUnlocked();
          setStatus("unlocked");
        } else {
          lockAdmin();
          setStatus("locked");
        }
      } catch {
        if (!cancelled) {
          lockAdmin();
          setStatus("locked");
        }
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("rc-admin-lock", onLockEvent);
    };
  }, [lockUi]);

  async function tryUnlock() {
    setError(null);
    setBusy(true);
    try {
      if (USE_MOCK) {
        if (!unlockAdminMock(pin)) {
          setError("Enter the admin PIN");
          return;
        }
        unlockUi();
        return;
      }
      await api.adminLogin(pin);
      unlockUi();
      setPin("");
    } catch (e) {
      const { message } = parseApiFailure(e);
      setError(message || "Incorrect PIN");
      lockAdmin();
      setStatus("locked");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return (
      <GridBackground>
        <main className="max-w-md mx-auto px-4 py-16">
          <p style={{ fontFamily: FO, color: "var(--sv-text-muted)", textAlign: "center" }}>
            Checking admin session…
          </p>
        </main>
      </GridBackground>
    );
  }

  if (status === "locked") {
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
                {USE_MOCK
                  ? " Mock mode: any non-empty PIN unlocks this browser only."
                  : " Live mode: PIN is verified on the server (never shown here)."}
              </p>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !busy) void tryUnlock();
                }}
                placeholder="Admin PIN"
                autoComplete="current-password"
                autoFocus
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

/**
 * Lock admin UI + clear server cookie (live). Safe to call from any admin page.
 * Dispatches an event so AdminGate re-renders the PIN screen without a full reload.
 */
export async function lockAdminSession(): Promise<void> {
  lockAdmin();
  if (!USE_MOCK) {
    try {
      await api.adminLogout();
    } catch {
      // Cookie clear may still have applied; ignore network blips on logout
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("rc-admin-lock"));
  }
}

/** If an admin API call returned 401/unauthorized, force the PIN screen. */
export async function reauthIfAdminExpired(err: unknown): Promise<boolean> {
  const { code, message } = parseApiFailure(err);
  const expired =
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    /admin credentials|admin pin|sign in again|incorrect admin pin/i.test(
      message,
    );
  if (!expired) return false;
  await lockAdminSession();
  return true;
}
