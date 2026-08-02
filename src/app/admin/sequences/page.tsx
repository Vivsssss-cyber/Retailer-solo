"use client";

import { FO, GameButton } from "@/components/cyan";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  SequencesSection,
  useAdminConfig,
} from "@/components/admin/GameConfigEditor";

export default function AdminSequencesPage() {
  const { config, update, save, message, savedAt } = useAdminConfig();

  if (!config) {
    return (
      <AdminShell title="Demand & supply">
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Demand & supply sequences"
      subtitle="Per-round customer demand and supply rate — fair shared sequences for every heat."
      actions={
        <GameButton type="button" size="sm" onClick={save}>
          Save
        </GameButton>
      }
    >
      {message && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--sv-positive)",
            marginBottom: 12,
          }}
        >
          {message}
          {savedAt ? ` · ${savedAt}` : ""}
        </p>
      )}

      <SequencesSection config={config} update={update} />

      <div className="flex gap-2">
        <GameButton type="button" onClick={save}>
          Save sequences
        </GameButton>
      </div>
    </AdminShell>
  );
}
