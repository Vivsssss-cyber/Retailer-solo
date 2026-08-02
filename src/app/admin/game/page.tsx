"use client";

import { FO, GameButton } from "@/components/cyan";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  GameIdentitySection,
  GameNumbersSection,
  InfoPanelsSection,
  ImportExportSection,
  useAdminConfig,
} from "@/components/admin/GameConfigEditor";

export default function AdminGamePage() {
  const {
    config,
    setConfig,
    update,
    save,
    reset,
    bumpVersion,
    savedAt,
    message,
    setMessage,
  } = useAdminConfig();

  if (!config) {
    return (
      <AdminShell title="Game numbers">
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Game numbers"
      subtitle="Rounds, delay, starting stock, costs, order limits — core stats control."
      actions={
        <>
          <GameButton type="button" size="sm" variant="outline" onClick={bumpVersion}>
            Bump version
          </GameButton>
          <GameButton type="button" size="sm" variant="secondary" onClick={reset}>
            Reset default
          </GameButton>
          <GameButton type="button" size="sm" onClick={save}>
            Save
          </GameButton>
        </>
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

      <GameIdentitySection config={config} update={update} />
      <GameNumbersSection config={config} update={update} />
      <InfoPanelsSection config={config} update={update} />
      <ImportExportSection config={config} setConfig={setConfig} setMessage={setMessage} />

      <div className="flex flex-wrap gap-2 sticky bottom-4 z-10">
        <GameButton type="button" onClick={save}>
          Save configuration
        </GameButton>
        <GameButton type="button" variant="outline" onClick={reset}>
          Reset to EU seed
        </GameButton>
      </div>
    </AdminShell>
  );
}
