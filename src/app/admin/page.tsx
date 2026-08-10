"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FO, GameButton } from "@/components/cyan";
import {
  AdminShell,
  AdminSection,
  StatTile,
  Package,
  Target,
  Trophy,
  Wallet,
} from "@/components/admin/AdminShell";
import { loadAdminConfig, readMockStoreStats } from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
import type { GameConfig } from "@/engine";

export default function AdminOverviewPage() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [stats] = useState(() => readMockStoreStats());

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        if (USE_MOCK) {
          if (!cancelled) setConfig(loadAdminConfig());
          return;
        }
        try {
          const remote = await api.getConfiguration("default");
          if (!cancelled) setConfig(remote);
        } catch {
          if (!cancelled) setConfig(loadAdminConfig());
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!config) {
    return (
      <AdminShell title="Overview">
        <p style={{ fontFamily: FO, color: "var(--sv-text-muted)" }}>Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Admin overview"
      subtitle="Control game stats and numbers for The Retailer Challenge (solo-beergame creator parity)."
      actions={
        <>
          <Link href="/admin/rooms">
            <GameButton type="button" size="sm">
              Create room
            </GameButton>
          </Link>
          <Link href="/admin/game">
            <GameButton type="button" size="sm" variant="secondary">
              Edit game numbers
            </GameButton>
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Heats"
          value={stats.heats}
          icon={<Trophy size={14} color="var(--sv-teal-mid)" />}
        />
        <StatTile
          label="Attempts"
          value={stats.attempts}
          icon={<Target size={14} color="var(--sv-teal-mid)" />}
        />
        <StatTile
          label="Playing"
          value={stats.playing}
          icon={<Package size={14} color="var(--sv-teal-mid)" />}
        />
        <StatTile
          label="Completed"
          value={stats.completed}
          icon={<Wallet size={14} color="var(--sv-teal-mid)" />}
        />
      </div>

      <AdminSection title="Active configuration snapshot">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm" style={{ fontFamily: FO }}>
          <Snap label="Name" value={config.game_name} />
          <Snap label="Config ID" value={config.configuration_id} />
          <Snap label="Version" value={`v${config.configuration_version}`} />
          <Snap label="Rounds" value={String(config.total_rounds)} />
          <Snap label="Delay" value={String(config.delivery_delay)} />
          <Snap
            label="Costs (inv / backlog)"
            value={`$${config.inventory_cost_per_unit} / $${config.backlog_cost_per_unit}`}
          />
          <Snap label="Start stock" value={String(config.starting_inventory)} />
          <Snap label="Order range" value={`${config.minimum_order}–${config.maximum_order}`} />
          <Snap label="Players / heat" value={String(config.maximum_players_per_heat)} />
          <Snap
            label="Demand sequence"
            value={`${config.demand_sequence_id} (${config.customer_demand_by_round.join(", ")})`}
          />
          <Snap
            label="Supply sequence"
            value={`${config.supply_sequence_id} (${config.supply_rate_by_round.map((r) => r.toFixed(1)).join(", ")})`}
          />
          <Snap
            label="Flags"
            value={[
              config.animation_enabled ? "anim" : null,
              config.leaderboard_enabled ? "heat LB" : null,
              config.global_leaderboard_enabled ? "global LB" : null,
              config.solo_practice_enabled ? "solo practice" : "join-only",
            ]
              .filter(Boolean)
              .join(" · ") || "none"}
          />
        </div>
      </AdminSection>

      <AdminSection title="Quick links">
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/game">
            <GameButton type="button" variant="secondary" size="sm">
              Game numbers &amp; costs
            </GameButton>
          </Link>
          <Link href="/admin/sequences">
            <GameButton type="button" variant="secondary" size="sm">
              Demand &amp; supply sequences
            </GameButton>
          </Link>
          <Link href="/admin/data">
            <GameButton type="button" variant="secondary" size="sm">
              Create group &amp; sessions
            </GameButton>
          </Link>
        </div>
        <p style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 12 }}>
          Players join via access code / QR — only admins create groups. Solo practice is a toggle under
          Game numbers. Config changes apply to <strong>new groups only</strong>.
        </p>
      </AdminSection>
    </AdminShell>
  );
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.5)",
        border: "1.4px solid white",
        borderRadius: 12,
        padding: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          color: "var(--sv-text-muted)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        className="sv-tabular"
        style={{
          fontWeight: 700,
          color: "var(--sv-ink)",
          fontSize: 13,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}
