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
    saving,
    source,
    useMock,
  } = useAdminConfig();

  if (!config) {
    return (
      <AdminShell title="Game numbers">
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
      </AdminShell>
    );
  }

  const isError = message?.startsWith("Save failed") || message?.startsWith("Reset failed");

  return (
    <AdminShell
      title="Game numbers"
      subtitle="Rounds, delay, starting stock, costs, order limits — core stats control."
      actions={
        <>
          <GameButton type="button" size="sm" variant="outline" onClick={bumpVersion}>
            Bump version
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() => void reset()}
          >
            Reset default
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save"}
          </GameButton>
        </>
      }
    >
      <p
        style={{
          fontFamily: FO,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--sv-text-muted)",
          marginBottom: 10,
        }}
      >
        Active source:{" "}
        <span style={{ color: "var(--sv-teal-mid)" }}>
          {useMock ? "mock (localStorage)" : source === "server" ? "server API" : "local cache"}
        </span>
        {useMock
          ? " · Set NEXT_PUBLIC_USE_MOCK=false to write the live backend."
          : " · Saves push to the API (new heats snapshot server config)."}
      </p>

      {message && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 13,
            fontWeight: 600,
            color: isError ? "var(--sv-negative)" : "var(--sv-positive)",
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
        <GameButton type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save configuration"}
        </GameButton>
        <GameButton
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void reset()}
        >
          Reset to EU seed
        </GameButton>
      </div>
    </AdminShell>
  );
}
