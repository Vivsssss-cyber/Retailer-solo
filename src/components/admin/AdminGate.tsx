"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FO, GameButton, GridBackground, PageTransition, cardStyle } from "@/components/cyan";
import { ADMIN_PIN, isAdminUnlocked, unlockAdmin } from "@/lib/adminConfigStore";

export function AdminGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUnlocked(isAdminUnlocked());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <GridBackground>
        <main className="max-w-md mx-auto px-4 py-16">
          <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
        </main>
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
                (Local mock only — default PIN: <code style={{ fontWeight: 700 }}>{ADMIN_PIN}</code>)
              </p>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (unlockAdmin(pin)) setUnlocked(true);
                    else setError("Incorrect PIN");
                  }
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
                <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-negative)", marginBottom: 12 }}>
                  {error}
                </p>
              )}
              <GameButton
                type="button"
                style={{ width: "100%" }}
                onClick={() => {
                  if (unlockAdmin(pin)) setUnlocked(true);
                  else setError("Incorrect PIN");
                }}
              >
                Unlock admin
              </GameButton>
            </div>
          </main>
        </PageTransition>
      </GridBackground>
    );
  }

  return <>{children}</>;
}
