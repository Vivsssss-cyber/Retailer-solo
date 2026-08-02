"use client";

import { FO, cardStyle } from "@/components/cyan";
import type { GameConfig } from "@/engine";

export function InfoPanelBanner({
  config,
  round,
}: {
  config: GameConfig;
  round: number;
}) {
  const text = config.info_panels?.find((p) => p.round === round)?.text;
  if (!text) return null;

  return (
    <div
      style={{
        ...cardStyle,
        padding: "12px 14px",
        background: "var(--sv-cyan-tint)",
        borderLeft: "4px solid var(--sv-teal-mid)",
      }}
    >
      <div
        style={{
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--sv-teal-mid)",
          marginBottom: 4,
        }}
      >
        Tip · {config.timeline_unit || "Round"} {round}
      </div>
      <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text)", margin: 0 }}>{text}</p>
    </div>
  );
}
