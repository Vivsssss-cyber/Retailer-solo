"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { FO, GameButton, GridBackground, PageTransition, cardStyle } from "@/components/cyan";
import { BookOpen, Package, Target, Trophy, Wallet } from "@/components/cyan/PixelIcons";
import { lockAdminSession } from "@/components/admin/AdminGate";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/game", label: "Game numbers" },
  { href: "/admin/sequences", label: "Demand & supply" },
  { href: "/admin/data", label: "Sessions & data" },
];

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const [locking, setLocking] = useState(false);

  async function handleLock() {
    if (locking) return;
    setLocking(true);
    try {
      await lockAdminSession();
    } finally {
      setLocking(false);
    }
  }

  return (
    <GridBackground>
      <PageTransition>
        <div className="max-w-[1100px] mx-auto px-4 py-6" style={{ color: "var(--sv-text)" }}>
          <header className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div className="min-w-0 flex-1">
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--sv-teal-mid)",
                  marginBottom: 4,
                }}
              >
                Admin control
              </p>
              <h1
                style={{
                  fontFamily: FO,
                  fontWeight: 800,
                  fontSize: 26,
                  color: "var(--sv-ink)",
                  letterSpacing: "-0.4px",
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text-secondary)", marginTop: 4 }}>
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end shrink-0">
              {actions}
              <GameButton
                type="button"
                variant="outline"
                size="sm"
                disabled={locking}
                onClick={() => void handleLock()}
              >
                {locking ? "Signing out…" : "Lock admin"}
              </GameButton>
              <Link href="/">
                <GameButton type="button" variant="secondary" size="sm">
                  Back to game
                </GameButton>
              </Link>
            </div>
          </header>

          <nav className="flex flex-wrap gap-2 mb-5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    fontFamily: FO,
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 9999,
                    border: active ? "1.5px solid var(--sv-teal-mid)" : "1.4px solid white",
                    background: active ? "var(--sv-cyan-tint)" : "var(--sv-card)",
                    color: active ? "var(--sv-teal-mid)" : "var(--sv-ink)",
                    textDecoration: "none",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {children}
        </div>
      </PageTransition>
    </GridBackground>
  );
}

export function AdminSection({
  title,
  subtitle,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div>
          <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 16, color: "var(--sv-ink)" }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 2 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span
        style={{
          fontFamily: FO,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--sv-text-muted)",
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontFamily: FO, fontSize: 11, color: "var(--sv-text-muted)" }}>{hint}</span>
      )}
    </label>
  );
}

export const adminInputStyle: CSSProperties = {
  fontFamily: FO,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--sv-ink)",
  background: "rgba(255,255,255,0.75)",
  border: "1.4px solid white",
  borderRadius: 10,
  padding: "10px 12px",
  width: "100%",
  outline: "none",
};

export function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.55)",
        border: "1.4px solid white",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span
          style={{
            fontFamily: FO,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--sv-text-muted)",
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="sv-tabular"
        style={{ fontFamily: FO, fontWeight: 800, fontSize: 22, color: "var(--sv-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

export { Package, Target, Trophy, Wallet, BookOpen };
