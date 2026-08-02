"use client";

import { FO, cardStyle } from "@/components/cyan";
import type { RoundRecord } from "@/engine";
import { getRoundCoaching } from "@/lib/coaching";

export function RoundCoaching({
  record,
  unit = "Round",
}: {
  record: RoundRecord;
  unit?: string;
}) {
  const { tone, message } = getRoundCoaching(record);
  const bg =
    tone === "danger"
      ? "rgba(198,82,82,0.1)"
      : tone === "warn"
        ? "rgba(180,83,9,0.1)"
        : "rgba(21,97,98,0.1)";
  const border =
    tone === "danger"
      ? "var(--sv-negative)"
      : tone === "warn"
        ? "var(--sv-warning)"
        : "var(--sv-positive)";
  const color =
    tone === "danger"
      ? "var(--sv-negative)"
      : tone === "warn"
        ? "var(--sv-warning)"
        : "var(--sv-positive)";

  return (
    <div
      style={{
        ...cardStyle,
        padding: "12px 14px",
        background: bg,
        borderLeft: `4px solid ${border}`,
      }}
    >
      <div
        style={{
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color,
          marginBottom: 4,
        }}
      >
        {unit} {record.round} feedback
      </div>
      <p style={{ fontFamily: FO, fontSize: 13, color: "var(--sv-text)", margin: 0 }}>{message}</p>
    </div>
  );
}
