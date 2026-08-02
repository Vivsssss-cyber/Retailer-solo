"use client";

import React from "react";
import { Target, Users, BarChart3 } from "@/components/cyan/PixelIcons";

interface DockStep {
  id: string;
  label: string;
  short: string;
  icon: React.ElementType;
}

const DOCK_STEPS: DockStep[] = [
  { id: "dashboard", label: "Dashboard", short: "Dash", icon: Target },
  { id: "supply-chain", label: "Supply Chain", short: "Supply", icon: Users },
  { id: "leaderboard", label: "Leaderboard", short: "Ranks", icon: BarChart3 }
];

export function GameDock({
  activeTab = "dashboard",
  onTabChange,
  onExit,
}: {
  activeTab?: string;
  onTabChange?: (id: string) => void;
  onExit?: () => void;
}) {
  return (
    <nav aria-label="Game navigation" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <div className="sv-frost-dock flex items-center gap-1 p-1.5 rounded-sv-pill">
        {DOCK_STEPS.map((step) => {
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onTabChange?.(step.id)}
              className={`sv-nav-tab flex items-center gap-2 rounded-sv-pill px-3 sm:px-4 py-2.5 transition-all duration-200 ${
                isActive
                  ? "sv-nav-tab-active bg-sv-cta-gradient text-white border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_3px_rgba(0,44,51,0.18)]"
                  : "text-sv-text-secondary hover:text-sv-ink hover:bg-sv-muted/70"
              }`}
              style={{
                fontFamily: "var(--sv-font-ui)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <step.icon size={13} />
              <span className="hidden md:inline">{step.label}</span>
              <span className="md:hidden">{step.short}</span>
            </button>
          );
        })}

        {onExit && (
          <>
            <span className="w-px h-6 bg-sv-border/70 mx-1" aria-hidden />
            <button
              onClick={onExit}
              className="sv-nav-tab flex items-center gap-2 rounded-sv-pill px-3 sm:px-4 py-2.5 text-sv-negative hover:bg-sv-danger-tint hover:text-sv-destructive transition-colors duration-200"
              style={{ fontFamily: "var(--sv-font-ui)", fontWeight: 600, fontSize: 14 }}
            >
              Exit
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
