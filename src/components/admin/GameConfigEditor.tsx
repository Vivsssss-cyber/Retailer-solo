"use client";

import { useCallback, useEffect, useState } from "react";
import { FO, GameButton } from "@/components/cyan";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CoachSpeech } from "@/components/coach/CoachSpeech";
import type { GameConfig } from "@/engine";
import {
  cloneDefaultConfig,
  exportConfigJson,
  importConfigJson,
  loadAdminConfig,
  normalizeGameConfig,
  resetAdminConfig,
  saveAdminConfig,
} from "@/lib/adminConfigStore";
import { handleAdminAuthFailure } from "@/lib/adminAuthClient";
import { api, USE_MOCK } from "@/services/api";
import { parseApiFailure } from "@/services/apiErrors";
import {
  AdminSection,
  Field,
  adminInputStyle,
} from "./AdminShell";

export function useAdminConfig() {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"local" | "server">("local");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (USE_MOCK) {
        if (!cancelled) {
          setConfig(loadAdminConfig());
          setSource("local");
        }
        return;
      }
      try {
        const remote = await api.getConfiguration("default");
        if (cancelled) return;
        setConfig(remote);
        saveAdminConfig(remote); // keep local cache in sync
        setSource("server");
      } catch {
        if (cancelled) return;
        setConfig(loadAdminConfig());
        setSource("local");
        setMessage("Could not load server config — showing local cache.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<GameConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setMessage(null);
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      // Always write local cache so mock heats / offline still work
      const localNext = saveAdminConfig(config);
      if (USE_MOCK) {
        setConfig(localNext);
        setSource("local");
        setSavedAt(new Date().toLocaleTimeString());
        setMessage("Saved locally. New mock heats will use these numbers.");
        return;
      }
      const remote = await api.putConfiguration(localNext);
      saveAdminConfig(remote);
      setConfig(remote);
      setSource("server");
      setSavedAt(new Date().toLocaleTimeString());
      setMessage(
        "Saved to server. New heats (live API) will snapshot these numbers.",
      );
    } catch (e) {
      if (handleAdminAuthFailure(e)) return;
      const { message: msg } = parseApiFailure(e);
      setMessage(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [config]);

  const reset = useCallback(async () => {
    if (!confirm("Reset all game numbers to the default EU seed?")) return;
    setSaving(true);
    try {
      const next = resetAdminConfig();
      if (!USE_MOCK) {
        const remote = await api.putConfiguration(cloneDefaultConfig());
        saveAdminConfig(remote);
        setConfig(remote);
        setSource("server");
        setMessage("Reset to EU seed on server.");
      } else {
        setConfig(next);
        setSource("local");
        setMessage("Reset to default configuration (local).");
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      if (handleAdminAuthFailure(e)) return;
      const { message: msg } = parseApiFailure(e);
      setMessage(`Reset failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, []);

  const bumpVersion = useCallback(() => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            configuration_version: (prev.configuration_version || 1) + 1,
          }
        : prev,
    );
  }, []);

  return {
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
    useMock: USE_MOCK,
  };
}

export function GameIdentitySection({
  config,
  update,
}: {
  config: GameConfig;
  update: (p: Partial<GameConfig>) => void;
}) {
  return (
    <AdminSection
      title="Simulation info"
      subtitle="Like solo-beergame creator — title, timeline, and copy shown to players."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Game name">
          <input
            style={adminInputStyle}
            value={config.game_name}
            onChange={(e) => update({ game_name: e.target.value })}
          />
        </Field>
        <Field label="Timeline unit" hint="Label for a period (Round / Week)">
          <input
            style={adminInputStyle}
            value={config.timeline_unit}
            onChange={(e) => update({ timeline_unit: e.target.value })}
          />
        </Field>
        <Field label="Configuration ID">
          <input
            style={adminInputStyle}
            value={config.configuration_id}
            onChange={(e) => update({ configuration_id: e.target.value })}
          />
        </Field>
        <Field label="Version" hint="Bump when you change fairness-critical numbers">
          <input
            type="number"
            min={1}
            style={adminInputStyle}
            value={config.configuration_version}
            onChange={(e) =>
              update({ configuration_version: parseInt(e.target.value, 10) || 1 })
            }
          />
        </Field>
        <Field label="Demand sequence ID">
          <input
            style={adminInputStyle}
            value={config.demand_sequence_id}
            onChange={(e) => update({ demand_sequence_id: e.target.value })}
          />
        </Field>
        <Field label="Supply sequence ID">
          <input
            style={adminInputStyle}
            value={config.supply_sequence_id}
            onChange={(e) => update({ supply_sequence_id: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Intro text">
          <textarea
            rows={3}
            style={{ ...adminInputStyle, resize: "vertical", fontWeight: 500 }}
            value={config.intro_text}
            onChange={(e) => update({ intro_text: e.target.value })}
          />
        </Field>
      </div>
    </AdminSection>
  );
}

export function GameNumbersSection({
  config,
  update,
}: {
  config: GameConfig;
  update: (p: Partial<GameConfig>) => void;
}) {
  const setRounds = (n: number) => {
    const total = Math.min(50, Math.max(1, n));
    const demand = [...config.customer_demand_by_round];
    const supply = [...config.supply_rate_by_round];
    while (demand.length < total) demand.push(demand[demand.length - 1] ?? 4);
    while (supply.length < total) supply.push(1);
    update({
      total_rounds: total,
      customer_demand_by_round: demand.slice(0, total),
      supply_rate_by_round: supply.slice(0, total),
    });
  };

  const setDelay = (n: number) => {
    const delay = Math.min(5, Math.max(1, n));
    const pipeline = [...config.starting_pipeline_orders];
    while (pipeline.length < delay) pipeline.push(4);
    update({
      delivery_delay: delay,
      starting_pipeline_orders: pipeline.slice(0, delay),
    });
  };

  return (
    <AdminSection
      title="Game numbers & starting state"
      subtitle="Rounds, delay, stock, costs — core beer-game stats control."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Total rounds" hint="Max 50">
          <input
            type="number"
            min={1}
            max={50}
            style={adminInputStyle}
            value={config.total_rounds}
            onChange={(e) => setRounds(parseInt(e.target.value, 10) || 1)}
          />
        </Field>
        <Field label="Delivery delay">
          <input
            type="number"
            min={1}
            max={5}
            style={adminInputStyle}
            value={config.delivery_delay}
            onChange={(e) => setDelay(parseInt(e.target.value, 10) || 1)}
          />
        </Field>
        <Field label="Starting inventory">
          <input
            type="number"
            min={0}
            style={adminInputStyle}
            value={config.starting_inventory}
            onChange={(e) =>
              update({ starting_inventory: parseInt(e.target.value, 10) || 0 })
            }
          />
        </Field>
        <Field label="Starting backlog">
          <input
            type="number"
            min={0}
            style={adminInputStyle}
            value={config.starting_backlog}
            onChange={(e) =>
              update({ starting_backlog: parseInt(e.target.value, 10) || 0 })
            }
          />
        </Field>
        <Field label="Inventory cost / unit">
          <input
            type="number"
            min={0}
            step={0.5}
            style={adminInputStyle}
            value={config.inventory_cost_per_unit}
            onChange={(e) =>
              update({ inventory_cost_per_unit: parseFloat(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Backlog cost / unit">
          <input
            type="number"
            min={0}
            step={0.5}
            style={adminInputStyle}
            value={config.backlog_cost_per_unit}
            onChange={(e) =>
              update({ backlog_cost_per_unit: parseFloat(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Min order">
          <input
            type="number"
            min={0}
            style={adminInputStyle}
            value={config.minimum_order}
            onChange={(e) =>
              update({ minimum_order: parseInt(e.target.value, 10) || 0 })
            }
          />
        </Field>
        <Field label="Max order">
          <input
            type="number"
            min={0}
            style={adminInputStyle}
            value={config.maximum_order}
            onChange={(e) =>
              update({ maximum_order: parseInt(e.target.value, 10) || 0 })
            }
          />
        </Field>
        <Field label="Max players / group">
          <input
            type="number"
            min={1}
            max={20}
            style={adminInputStyle}
            value={config.maximum_players_per_heat}
            onChange={(e) =>
              update({ maximum_players_per_heat: parseInt(e.target.value, 10) || 1 })
            }
          />
        </Field>
      </div>

      <div className="mt-4">
        <p
          style={{
            fontFamily: FO,
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            color: "var(--sv-text-muted)",
            marginBottom: 8,
          }}
        >
          Starting pipeline (arrives next → last slot)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {config.starting_pipeline_orders.map((v, i) => (
            <Field key={i} label={`Slot t+${i + 1}`}>
              <input
                type="number"
                min={0}
                style={adminInputStyle}
                value={v}
                onChange={(e) => {
                  const next = [...config.starting_pipeline_orders];
                  next[i] = parseInt(e.target.value, 10) || 0;
                  update({ starting_pipeline_orders: next });
                }}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-4">
        <Toggle
          label="Leaderboard enabled"
          checked={config.leaderboard_enabled}
          onChange={(v) => update({ leaderboard_enabled: v })}
        />
        <Toggle
          label="Global leaderboard"
          checked={config.global_leaderboard_enabled}
          onChange={(v) => update({ global_leaderboard_enabled: v })}
        />
        <Toggle
          label="Animation enabled"
          checked={config.animation_enabled}
          onChange={(v) => update({ animation_enabled: v })}
        />
        <Toggle
          label="Solo practice (players)"
          checked={config.solo_practice_enabled === true}
          onChange={(v) => update({ solo_practice_enabled: v })}
        />
      </div>
      <p
        style={{
          fontFamily: FO,
          fontSize: 12,
          color: "var(--sv-text-muted)",
          marginTop: 10,
          lineHeight: 1.4,
        }}
      >
        When solo practice is off, players can only join groups you create (code / QR).
        Create and share groups from Sessions &amp; data.
      </p>
    </AdminSection>
  );
}

export function SequencesSection({
  config,
  update,
}: {
  config: GameConfig;
  update: (p: Partial<GameConfig>) => void;
}) {
  const [demandMin, setDemandMin] = useState(2);
  const [demandMax, setDemandMax] = useState(12);

  // Cyclical preset states
  const [amplitude, setAmplitude] = useState(3);
  const [period, setPeriod] = useState(8);
  const [baseline, setBaseline] = useState(6);

  // Disruption preset states
  const [disruptAt, setDisruptAt] = useState(5);
  const [disruptTo, setDisruptTo] = useState(0.2);
  const [recovery, setRecovery] = useState(3);

  const fillDemand = (value: number) => {
    update({
      customer_demand_by_round: Array.from({ length: config.total_rounds }, () => value),
    });
  };

  const stepDemand = (early: number, late: number, stepAt: number) => {
    update({
      customer_demand_by_round: Array.from({ length: config.total_rounds }, (_, i) =>
        i + 1 < stepAt ? early : late,
      ),
    });
  };

  const randomDemand = (min: number, max: number) => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const floorLo = Math.max(0, Math.floor(lo));
    const floorHi = Math.max(floorLo, Math.floor(hi));
    update({
      customer_demand_by_round: Array.from({ length: config.total_rounds }, () =>
        Math.floor(Math.random() * (floorHi - floorLo + 1)) + floorLo,
      ),
    });
  };

  const cyclicalDemand = (amp: number, per: number, base: number) => {
    update({
      customer_demand_by_round: Array.from({ length: config.total_rounds }, (_, i) =>
        Math.max(0, Math.round(base + amp * Math.sin((2 * Math.PI * i) / per))),
      ),
    });
  };

  const fillSupply = (rate: number) => {
    update({
      supply_rate_by_round: Array.from({ length: config.total_rounds }, () => rate),
    });
  };

  const supplyDisruption = (dropAt: number, dropTo: number, recoveryRounds: number) => {
    const rates = Array.from({ length: config.total_rounds }, (_, i) => {
      const roundNum = i + 1;
      if (roundNum < dropAt) return 1;
      if (roundNum === dropAt) return dropTo;
      const diff = roundNum - dropAt;
      if (diff >= recoveryRounds) return 1;
      const fraction = diff / recoveryRounds;
      const val = dropTo + (1 - dropTo) * fraction;
      return parseFloat(val.toFixed(2));
    });
    update({ supply_rate_by_round: rates });
  };

  // Recharts data formatting
  const chartData = config.customer_demand_by_round.map((demand, index) => ({
    roundNum: index + 1,
    roundLabel: `R${index + 1}`,
    demand,
    supplyRate: Math.round((config.supply_rate_by_round[index] ?? 1) * 100),
  }));

  return (
    <>
      <AdminSection
        title="Sequence visualizer"
        subtitle="Live graph showing Customer Demand vs Supply Fulfillment Rate."
      >
        <div
          style={{
            background: "rgba(255,255,255,0.4)",
            border: "1.4px solid white",
            borderRadius: 16,
            padding: 16,
            height: 240,
            width: "100%",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="roundLabel" style={{ fontSize: 10, fontFamily: FO, fontWeight: 700 }} stroke="var(--sv-text-muted)" />
              <YAxis yAxisId="left" style={{ fontSize: 10, fontFamily: FO }} stroke="var(--sv-teal-mid)" label={{ value: 'Demand (units)', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 10, fontFamily: FO, fontWeight: 700 } }} />
              <YAxis yAxisId="right" orientation="right" style={{ fontSize: 10, fontFamily: FO }} stroke="#f43f5e" label={{ value: 'Supply Rate (%)', angle: 90, position: 'insideRight', offset: 0, style: { fontSize: 10, fontFamily: FO, fontWeight: 700 } }} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontFamily: FO, fontSize: 11, borderRadius: 8, border: "1.4px solid white" }} />
              <Legend wrapperStyle={{ fontFamily: FO, fontSize: 11, fontWeight: 600 }} />
              <Line yAxisId="left" type="monotone" dataKey="demand" name="Customer Demand" stroke="var(--sv-teal-mid)" strokeWidth={2.5} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="supplyRate" name="Supply Rate (%)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AdminSection>

      <AdminSection
        title="Customer demand by round"
        subtitle="Same sequence for every player in a heat (fairness). Edit cells or use generators."
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <GameButton type="button" size="sm" variant="secondary" onClick={() => fillDemand(4)}>
            All 4
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => stepDemand(4, 8, 5)}
          >
            Step 4→8 @ R5
          </GameButton>
        </div>

        {/* Demand generators grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Random demand generator */}
          <div
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "1.4px solid white",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <p style={{ fontFamily: FO, fontSize: 12, fontWeight: 700, color: "var(--sv-ink)", marginBottom: 4 }}>
              Random Demand
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Min (A)">
                <input
                  type="number"
                  min={0}
                  style={{ ...adminInputStyle, width: 70, padding: "6px 8px" }}
                  value={demandMin}
                  onChange={(e) => setDemandMin(parseInt(e.target.value, 10) || 0)}
                />
              </Field>
              <Field label="Max (B)">
                <input
                  type="number"
                  min={0}
                  style={{ ...adminInputStyle, width: 70, padding: "6px 8px" }}
                  value={demandMax}
                  onChange={(e) => setDemandMax(parseInt(e.target.value, 10) || 0)}
                />
              </Field>
              <GameButton
                type="button"
                size="sm"
                onClick={() => randomDemand(demandMin, demandMax)}
              >
                Generate
              </GameButton>
            </div>
          </div>

          {/* Cyclical seasonal sine-wave generator */}
          <div
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "1.4px solid white",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <p style={{ fontFamily: FO, fontSize: 12, fontWeight: 700, color: "var(--sv-ink)", marginBottom: 4 }}>
              Cyclical Sine-Wave Demand
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Amp">
                <input
                  type="number"
                  min={1}
                  style={{ ...adminInputStyle, width: 56, padding: "6px 8px" }}
                  value={amplitude}
                  onChange={(e) => setAmplitude(parseInt(e.target.value, 10) || 1)}
                />
              </Field>
              <Field label="Period">
                <input
                  type="number"
                  min={2}
                  style={{ ...adminInputStyle, width: 56, padding: "6px 8px" }}
                  value={period}
                  onChange={(e) => setPeriod(parseInt(e.target.value, 10) || 2)}
                />
              </Field>
              <Field label="Base">
                <input
                  type="number"
                  min={0}
                  style={{ ...adminInputStyle, width: 56, padding: "6px 8px" }}
                  value={baseline}
                  onChange={(e) => setBaseline(parseInt(e.target.value, 10) || 0)}
                />
              </Field>
              <GameButton
                type="button"
                size="sm"
                onClick={() => cyclicalDemand(amplitude, period, baseline)}
              >
                Generate
              </GameButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {config.customer_demand_by_round.map((v, i) => (
            <Field key={i} label={`R${i + 1}`}>
              <input
                type="number"
                min={0}
                style={{ ...adminInputStyle, padding: "8px" }}
                value={v}
                onChange={(e) => {
                  const next = [...config.customer_demand_by_round];
                  next[i] = parseInt(e.target.value, 10) || 0;
                  update({ customer_demand_by_round: next });
                }}
              />
            </Field>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Supply rate by round"
        subtitle="0–1 multiplier on scheduled delivery (floor). 1 = full fulfillment from upstream."
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <GameButton type="button" size="sm" variant="secondary" onClick={() => fillSupply(1)}>
            Full supply (1.0)
          </GameButton>
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              update({
                supply_rate_by_round: config.supply_rate_by_round.map((_, i) =>
                  [3, 6, 10].includes(i + 1) ? 0.8 : 1,
                ),
              })
            }
          >
            Mild disruptions
          </GameButton>
        </div>

        {/* Disruption drop generator */}
        <div
          style={{
            background: "rgba(255,255,255,0.5)",
            border: "1.4px solid white",
            borderRadius: 14,
            padding: 12,
            marginBottom: 16,
          }}
          className="max-w-xl"
        >
          <p style={{ fontFamily: FO, fontSize: 12, fontWeight: 700, color: "var(--sv-ink)", marginBottom: 4 }}>
            Disruption Generator
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Drop At Round" hint="e.g. R5">
              <input
                type="number"
                min={1}
                max={config.total_rounds}
                style={{ ...adminInputStyle, width: 80, padding: "6px 8px" }}
                value={disruptAt}
                onChange={(e) => setDisruptAt(parseInt(e.target.value, 10) || 1)}
              />
            </Field>
            <Field label="Drop Rate (0-1)" hint="e.g. 0.2">
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                style={{ ...adminInputStyle, width: 90, padding: "6px 8px" }}
                value={disruptTo}
                onChange={(e) => setDisruptTo(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Recovery (Rounds)" hint="linear recovery">
              <input
                type="number"
                min={1}
                style={{ ...adminInputStyle, width: 90, padding: "6px 8px" }}
                value={recovery}
                onChange={(e) => setRecovery(parseInt(e.target.value, 10) || 1)}
              />
            </Field>
            <GameButton
              type="button"
              size="sm"
              onClick={() => supplyDisruption(disruptAt, disruptTo, recovery)}
            >
              Generate disruption
            </GameButton>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {config.supply_rate_by_round.map((v, i) => (
            <Field key={i} label={`R${i + 1}`}>
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                style={{ ...adminInputStyle, padding: "8px" }}
                value={v}
                onChange={(e) => {
                  const next = [...config.supply_rate_by_round];
                  next[i] = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0));
                  update({ supply_rate_by_round: next });
                }}
              />
            </Field>
          ))}
        </div>
      </AdminSection>
    </>
  );
}

export function InfoPanelsSection({
  config,
  update,
}: {
  config: GameConfig;
  update: (p: Partial<GameConfig>) => void;
}) {
  const panels = config.info_panels ?? [];
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const selectedPanel = panels[previewIndex] ?? panels[0];

  return (
    <AdminSection
      title="Coaching / info panels"
      subtitle="Optional banners shown at the start of a given round. Gated to maximum rounds."
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        <div>
          {panels.map((p, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[100px_1fr_auto] gap-2 mb-2">
              <Field label="Round">
                <input
                  type="number"
                  min={1}
                  max={config.total_rounds}
                  style={adminInputStyle}
                  value={p.round}
                  onChange={(e) => {
                    const next = [...panels];
                    const r = Math.min(config.total_rounds, Math.max(1, parseInt(e.target.value, 10) || 1));
                    next[i] = { ...next[i], round: r };
                    update({ info_panels: next });
                  }}
                />
              </Field>
              <Field label="Text">
                <input
                  style={adminInputStyle}
                  value={p.text}
                  onChange={(e) => {
                    const next = [...panels];
                    next[i] = { ...next[i], text: e.target.value };
                    update({ info_panels: next });
                  }}
                />
              </Field>
              <div className="flex items-end gap-1">
                <GameButton
                  type="button"
                  size="sm"
                  variant={previewIndex === i ? "secondary" : "outline"}
                  onClick={() => setPreviewIndex(i)}
                >
                  Preview
                </GameButton>
                <GameButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    update({ info_panels: panels.filter((_, j) => j !== i) });
                    if (previewIndex >= panels.length - 1) {
                      setPreviewIndex(Math.max(0, panels.length - 2));
                    }
                  }}
                >
                  Remove
                </GameButton>
              </div>
            </div>
          ))}
          <div className="mt-3">
            <GameButton
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const nextRound = panels.length > 0 ? Math.min(config.total_rounds, panels[panels.length - 1].round + 1) : 1;
                update({
                  info_panels: [...panels, { round: nextRound, text: "New coaching tip…" }],
                });
                setPreviewIndex(panels.length);
              }}
            >
              Add panel
            </GameButton>
          </div>
        </div>

        {/* Live RPG Speech Bubble Preview */}
        <div
          style={{
            background: "rgba(255,255,255,0.45)",
            border: "1.4px solid white",
            borderRadius: 16,
            padding: 14,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <p
            style={{
              fontFamily: FO,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              color: "var(--sv-text-muted)",
              marginBottom: 8,
            }}
          >
            Live RPG coach preview
          </p>
          {selectedPanel ? (
            <div className="flex-1 flex items-center justify-center p-3 bg-[var(--sv-card)] rounded-xl border border-white/50 overflow-hidden min-h-[140px]">
              <div className="w-full">
                <CoachSpeech
                  line={selectedPanel.text}
                  messageKey={`${previewIndex}-${selectedPanel.text}-${selectedPanel.round}`}
                  tone="tip"
                  size="md"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-3 bg-[var(--sv-card)] rounded-xl border border-white/50 text-xs text-[var(--sv-text-muted)] font-semibold text-center">
              Add a coaching tip or click &quot;Preview&quot; to inspect a panel.
            </div>
          )}
        </div>
      </div>
    </AdminSection>
  );
}

export function ImportExportSection({
  config,
  setConfig,
  setMessage,
}: {
  config: GameConfig;
  setConfig: (c: GameConfig) => void;
  setMessage: (m: string) => void;
}) {
  return (
    <AdminSection title="Import / export JSON" subtitle="Share configs across machines or version control.">
      <div className="flex flex-wrap gap-2 mb-3">
        <GameButton
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const blob = new Blob([exportConfigJson(config)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${config.configuration_id}-v${config.configuration_version}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage("Exported configuration JSON.");
          }}
        >
          Download JSON
        </GameButton>
        <label>
          <span className="sr-only">Import JSON</span>
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            id="admin-import-json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                setConfig(importConfigJson(text));
                setMessage("Imported configuration — click Save to apply.");
              } catch {
                setMessage("Invalid JSON file.");
              }
              e.target.value = "";
            }}
          />
          <GameButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => document.getElementById("admin-import-json")?.click()}
          >
            Import JSON
          </GameButton>
        </label>
        <GameButton
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setConfig(normalizeGameConfig(config));
            setMessage("Normalized lengths and clamps.");
          }}
        >
          Normalize
        </GameButton>
      </div>
      <pre
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 11,
          background: "rgba(255,255,255,0.5)",
          border: "1.4px solid white",
          borderRadius: 12,
          padding: 12,
          maxHeight: 200,
          overflow: "auto",
          color: "var(--sv-ink)",
        }}
      >
        {exportConfigJson(config)}
      </pre>
    </AdminSection>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "var(--sv-teal-mid)" }}
      />
      <span style={{ fontFamily: FO, fontSize: 13, fontWeight: 600, color: "var(--sv-ink)" }}>
        {label}
      </span>
    </label>
  );
}
