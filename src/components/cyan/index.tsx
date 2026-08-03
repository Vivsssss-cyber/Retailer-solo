"use client";

import React, { ReactNode } from "react";

export function GridBackground({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`sv-grid-bg min-h-screen w-full relative ${className}`}>
      {children}
    </div>
  );
}

export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`transition-all duration-300 ease-out opacity-100 ${className}`}>
      {children}
    </div>
  );
}

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function GameButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  style,
  ...props
}: GameButtonProps) {
  let variantClass = "";
  switch (variant) {
    case "primary":
      variantClass = "bg-sv-cta-gradient text-white border-none shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_3px_rgba(0,44,51,0.18)]";
      break;
    case "secondary":
      variantClass = "bg-sv-cyan-tint text-sv-teal-mid border border-sv-border hover:bg-sv-muted";
      break;
    case "outline":
      variantClass = "bg-transparent text-sv-ink border-[1.5px] border-sv-border hover:border-sv-teal-mid/40";
      break;
    case "danger":
      variantClass = "bg-sv-destructive text-white border-none shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]";
      break;
    case "ghost":
      variantClass = "bg-transparent text-sv-text-secondary hover:text-sv-ink hover:bg-sv-muted/70";
      break;
  }

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-[13px] h-8",
    md: "px-5 py-2.5 text-[14px] h-10",
    lg: "px-7 py-3.5 text-[16px] h-12",
  };

  return (
    <button
      style={{
        fontFamily: "var(--sv-font-ui)",
        fontWeight: 600,
        ...style,
      }}
      className={`rounded-sv-pill inline-flex items-center justify-center gap-2 transition-all duration-150 hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${variantClass} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

/**
 * Quiet circular segmented tabs — low chrome, soft active pill.
 * Used in chart / leaderboard headers (not primary navigation).
 */
export function TabBar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={{
        background: "var(--sv-muted)",
        border: "1px solid var(--sv-border-soft, var(--sv-border))",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="relative inline-flex items-center justify-center gap-1.5 rounded-full transition-colors duration-150 min-h-9 sm:min-h-0 touch-manipulation"
            style={{
              fontFamily: "var(--sv-font-ui)",
              fontWeight: isActive ? 600 : 500,
              fontSize: 12,
              letterSpacing: "-0.01em",
              padding: "8px 12px",
              lineHeight: 1.2,
              color: isActive ? "var(--sv-ink)" : "var(--sv-text-muted)",
              background: isActive ? "var(--sv-card-solid, #fff)" : "transparent",
              border: isActive
                ? "1px solid color-mix(in srgb, var(--sv-border) 70%, white)"
                : "1px solid transparent",
              boxShadow: isActive
                ? "0 1px 2px rgba(0, 44, 51, 0.06)"
                : "none",
            }}
          >
            <span>{tab.label}</span>
            {tab.badge != null && tab.badge !== "" && (
              <span
                className="sv-tabular"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isActive ? "var(--sv-teal-mid)" : "var(--sv-text-muted)",
                  opacity: 0.9,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`sv-glass-card ${onClick ? "cursor-pointer active:translate-y-px hover:border-sv-teal-mid/40" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export const cardStyle: React.CSSProperties = {
  background: "var(--sv-card)",
  border: "1.4px solid white",
  borderRadius: "var(--sv-radius-2xl)",
  padding: 16,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 4px 14px rgba(0, 44, 51, 0.04)"
};

export const FO = "var(--sv-font-ui)";

export {
  Package,
  Truck,
  Users,
  AlertCircle,
  Wallet,
  Clock,
  Trophy,
  Info,
  BarChart3,
  TrendingUp,
  Box,
  ShoppingCart,
  DollarSign,
  BookOpen,
  Star,
  PieChart,
  Play,
  Target,
  Zap,
  CheckCircle,
  CheckCircle2,
} from "./PixelIcons";

export { Package as PackageIcon, Truck as TruckIcon, Users as UsersIcon, Trophy as TrophyIcon, AlertCircle as AlertIcon } from "./PixelIcons";
