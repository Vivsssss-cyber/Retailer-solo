"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
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
  const unlocked = sessionUnlocked || localUnlocked;
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function tryUnlock() {
    setError(null);
    setBusy(true);
    try {
      if (USE_MOCK) {
        if (!unlockAdminMock(pin)) {
          setError("Enter the admin PIN");
          return;
        }
        setLocalUnlocked(true);
        return;
      }
      await api.adminLogin(pin);
      markAdminUnlocked();
      setLocalUnlocked(true);
    } catch (e) {
      const { message } = parseApiFailure(e);
      setError(message || "Incorrect PIN");
    } finally {
      setBusy(false);
    }
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
                <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-negative)", marginBottom: 12 }}>
                  {error}
                </p>
              )}
              <GameButton
                type="button"
                style={{ width: "100%" }}
                disabled={busy}
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

  return (
    <>
      {children}
      {/* Hidden helper for lock paths that import lockAdmin + optional logout */}
      <span
        data-admin-unlocked="1"
        style={{ display: "none" }}
        aria-hidden
        onClick={() => {
          lockAdmin();
          if (!USE_MOCK) void api.adminLogout();
        }}
      />
    </>
  );
}
