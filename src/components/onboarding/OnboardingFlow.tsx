"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FO,
  GameButton,
  GridBackground,
  PageTransition,
  GlassCard,
} from "@/components/cyan";
import {
  Package,
  Truck,
  Target,
  Users,
  DollarSign,
} from "@/components/cyan/PixelIcons";
import { useAttemptStore } from "@/store/useAttemptStore";
import { DEFAULT_CONFIG, type GameConfig } from "@/engine";
import { loadAdminConfig } from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
// USE_MOCK shown on host screen — multiplayer needs live API across devices
import {
  PERSONA_AVATAR_PLACEHOLDER,
  PERSONAS,
  personaBySlug,
  type PersonaSlug,
} from "@/lib/personas";
import { writePlayerProfile } from "@/lib/playerProfile";
import { CoachSpeech } from "@/components/coach";

// ---------------------------------------------------------
// Coach lines (Segment-style left coach + chat bubble)
// ---------------------------------------------------------

const COACH_LINES: Record<string, string> = {
  welcome: "I'm your coach. Before we open the warehouse — let's get you set up.",
  identity: "Pick a face and a name. Cosmetic only — scoring stays fair.",
  mode: "Solo to practice, host a heat for your class, or join with a code.",
  heatCode: "Ask your host for the code. Then we can join the heat.",
  hostShare: "Share this code with your group. They join from the home screen.",
  official:
    "Official locks one attempt per email for the event board. Practice stays unlimited.",
  loading: "Locking in your setup. Warehouse opens in a second…",
};

type PlayMode = "solo" | "host" | "heat";

const IDENTITY_KEY = "retailer-challenge-player-identity";

function readSavedIdentity(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(IDENTITY_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveIdentity(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(IDENTITY_KEY, value);
    else sessionStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <GlassCard className="p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span
          style={{
            fontFamily: FO,
            fontSize: 10,
            fontWeight: 700,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="sv-tabular"
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 16,
          color: "var(--sv-ink)",
        }}
      >
        {value}
      </div>
    </GlassCard>
  );
}

function SelectionCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center p-4 rounded-xl border-[1.5px] cursor-pointer transition-all duration-200 text-left ${
        active 
          ? "border-sv-teal-mid bg-sv-cyan-tint text-sv-teal-mid"
          : "border-sv-border bg-white/70 text-sv-ink hover:border-sv-teal-mid/40"
      }`}
      style={{ fontFamily: FO }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------
// Screens — Welcome → Identity → Mode → Play
// ---------------------------------------------------------

function WelcomeScreen({ onNext, config }: { onNext: () => void; config: GameConfig }) {
  const unit = (config.timeline_unit || "Round").toLowerCase().slice(0, 3);
  return (
    <GlassCard className="text-center relative overflow-hidden p-4">
      <div className="flex justify-center mb-6">
        <Image src="/cyan-logo.svg" alt="CYAN" width={64} height={64} unoptimized />
      </div>
      <h1
        style={{
          fontFamily: FO,
          fontWeight: 800,
          fontSize: 32,
          color: "var(--sv-ink)",
          marginBottom: 16,
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
        }}
      >
        Master your
        <br />
        Supply Chain
      </h1>
      <p
        style={{
          fontFamily: FO,
          fontSize: 16,
          color: "var(--sv-text-secondary)",
          marginBottom: 32,
        }}
      >
        Step into the shoes of a supply chain manager. Can you balance costs and satisfy demand?
      </p>

      <div className="grid grid-cols-3 gap-2 mb-8 text-left">
        <Fact
          icon={<Package size={16} color="var(--sv-teal-mid)" />}
          label="Rounds"
          value={String(config.total_rounds)}
        />
        <Fact
          icon={<Truck size={16} color="var(--sv-teal-mid)" />}
          label="Delay"
          value={`${config.delivery_delay} ${unit}`}
        />
        <Fact
          icon={<DollarSign size={16} color="var(--sv-teal-mid)" />}
          label="Costs"
          value={`$${config.inventory_cost_per_unit}/$${config.backlog_cost_per_unit}`}
        />
      </div>

      <GameButton size="lg" style={{ width: "100%" }} onClick={onNext}>
        Get Started
      </GameButton>
    </GlassCard>
  );
}

/** Combined avatar + name — one Identity step. */
function IdentityScreen({
  persona,
  name,
  onPersonaChange,
  onNameChange,
  onNext,
  onHoverPersona,
}: {
  persona: PersonaSlug | "";
  name: string;
  onPersonaChange: (slug: PersonaSlug) => void;
  onNameChange: (v: string) => void;
  onNext: () => void;
  onHoverPersona?: (slug: PersonaSlug | null) => void;
}) {
  const selected = personaBySlug(persona);
  const canContinue = !!persona && name.trim().length > 0;

  return (
    <GlassCard className="p-4">
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: "var(--sv-ink)",
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        Your identity
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        Avatar and name for the board. Doesn&apos;t change scoring.
      </p>

      <span
        style={{
          display: "block",
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--sv-teal-mid)",
          marginBottom: 10,
        }}
      >
        Avatar
      </span>
      <div
        role="radiogroup"
        aria-label="Choose a persona avatar"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
        onMouseLeave={() => onHoverPersona?.(null)}
      >
        {PERSONAS.map((p) => {
          const active = persona === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={p.name}
              onClick={() => onPersonaChange(p.slug)}
              onMouseEnter={() => onHoverPersona?.(p.slug)}
              onFocus={() => onHoverPersona?.(p.slug)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                borderRadius: 14,
                border: active ? "2px solid var(--sv-teal-mid)" : "1.5px solid var(--sv-border)",
                background: active ? "var(--sv-cyan-tint)" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span
                style={{
                  width: 108,
                  height: 108,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  borderRadius: 12,
                  background: "transparent",
                }}
              >
                <Image
                  src={p.avatarSrc}
                  alt=""
                  width={108}
                  height={108}
                  unoptimized
                  style={{
                    width: 108,
                    height: 108,
                    objectFit: "contain",
                    imageRendering: "pixelated",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PERSONA_AVATAR_PLACEHOLDER;
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <label
        htmlFor="player-name"
        style={{
          display: "block",
          fontFamily: FO,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--sv-teal-mid)",
          marginBottom: 8,
        }}
      >
        Display name
      </label>
      <input
        id="player-name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g. Ava"
        maxLength={24}
        style={{
          width: "100%",
          fontFamily: FO,
          fontSize: 18,
          padding: "14px 16px",
          borderRadius: 12,
          border: "2px solid var(--sv-border)",
          background: "rgba(255,255,255,0.8)",
          color: "var(--sv-ink)",
          marginBottom: 16,
          outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canContinue) onNext();
        }}
      />

      {selected && name.trim() && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--sv-border)",
            background: "rgba(255,255,255,0.6)",
          }}
        >
          <Image
            src={selected.avatarSrc}
            alt=""
            width={40}
            height={40}
            unoptimized
            style={{ width: 40, height: 40, objectFit: "contain", imageRendering: "pixelated" }}
          />
          <div className="min-w-0">
            <p
              style={{
                fontFamily: FO,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--sv-ink)",
                margin: 0,
              }}
              className="truncate"
            >
              {name.trim()}
            </p>
            <p
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--sv-text-secondary)",
                margin: 0,
              }}
            >
              {selected.name}
            </p>
          </div>
        </div>
      )}

      <GameButton size="lg" style={{ width: "100%" }} disabled={!canContinue} onClick={onNext}>
        Continue
      </GameButton>
    </GlassCard>
  );
}

function ModeScreen({
  value,
  onChange,
  onNext,
}: {
  value: PlayMode;
  onChange: (v: PlayMode) => void;
  onNext: () => void;
}) {
  const options: {
    id: PlayMode;
    title: string;
    blurb: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "solo",
      title: "Solo Practice",
      blurb: "Learn the ropes on your own heat.",
      icon: <Target size={20} color="currentColor" />,
    },
    {
      id: "host",
      title: "Host a Heat",
      blurb: "Create a code and invite up to 4 players.",
      icon: <Users size={20} color="currentColor" />,
    },
    {
      id: "heat",
      title: "Join a Heat",
      blurb: "Enter a code from your host or instructor.",
      icon: <Package size={20} color="currentColor" />,
    },
  ];

  return (
    <GlassCard className="p-4">
      <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 24, color: "var(--sv-ink)", marginBottom: 24 }}>
        How do you want to play?
      </h2>
      <div className="flex flex-col gap-3 mb-8">
        {options.map((opt) => (
          <SelectionCard key={opt.id} active={value === opt.id} onClick={() => onChange(opt.id)}>
            <div className="flex items-center gap-3 w-full">
              <div
                style={{
                  background: value === opt.id ? "var(--sv-teal-mid)" : "var(--sv-border)",
                  color: "white",
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                {opt.icon}
              </div>
              <div className="text-left flex-1">
                <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 15 }}>{opt.title}</div>
                <div style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 2 }}>
                  {opt.blurb}
                </div>
              </div>
            </div>
          </SelectionCard>
        ))}
      </div>
      <GameButton size="lg" style={{ width: "100%" }} onClick={onNext}>
        Continue
      </GameButton>
    </GlassCard>
  );
}

function HeatCodeScreen({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <GlassCard className="p-4">
      <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 24, color: "var(--sv-ink)", marginBottom: 8 }}>
        Enter Heat Code
      </h2>
      <p style={{ fontFamily: FO, fontSize: 14, color: "var(--sv-text-secondary)", marginBottom: 24 }}>
        Ask your instructor or host for the access code.
      </p>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="e.g. ABC123"
        style={{
          width: "100%",
          fontFamily: FO,
          fontSize: 18,
          padding: "16px",
          borderRadius: 12,
          border: "2px solid var(--sv-border)",
          background: "rgba(255,255,255,0.8)",
          color: "var(--sv-ink)",
          marginBottom: 32,
          letterSpacing: "0.1em",
          textAlign: "center",
          outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onNext();
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "16px",
            borderRadius: 12,
            border: "1.5px solid var(--sv-border)",
            background: "rgba(255,255,255,0.5)",
            fontFamily: FO,
            fontWeight: 600,
            fontSize: 15,
            color: "var(--sv-text-secondary)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <GameButton size="lg" style={{ flex: 1 }} disabled={!value.trim()} onClick={onNext}>
          Continue
        </GameButton>
      </div>
    </GlassCard>
  );
}

/** Host path: create heat, show shareable code, then enter as first player. */
function HostShareScreen({
  accessCode,
  heatId,
  creating,
  error,
  onCreate,
  onEnter,
  onBack,
}: {
  accessCode: string | null;
  heatId: string | null;
  creating: boolean;
  error: string | null;
  onCreate: () => void;
  onEnter: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!accessCode && !creating && !error) {
      onCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once on mount
  }, []);

  const copyCode = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select via prompt-less ignore */
    }
  };

  return (
    <GlassCard className="p-4 text-center">
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: "var(--sv-ink)",
          marginBottom: 8,
        }}
      >
        Your heat code
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 16,
        }}
      >
        Share this with your group. Up to 4 players can join, including you.
      </p>

      {USE_MOCK && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--sv-warning, #b45309)",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 16,
            textAlign: "left",
            lineHeight: 1.4,
          }}
        >
          Mock mode: this code only works in <strong>this browser</strong>. For
          classmates on other devices, set{" "}
          <code style={{ fontSize: 11 }}>NEXT_PUBLIC_USE_MOCK=false</code> in{" "}
          <code style={{ fontSize: 11 }}>.env.local</code> and restart the app.
        </p>
      )}

      {creating && !accessCode && (
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-4 border-t-[var(--sv-teal-mid)] border-b-[var(--sv-teal-mid)] border-l-transparent border-r-transparent rounded-full animate-spin" />
        </div>
      )}

      {accessCode && (
        <>
          <div
            style={{
              fontFamily: FO,
              fontWeight: 800,
              fontSize: 36,
              letterSpacing: "0.18em",
              color: "var(--sv-teal-mid)",
              padding: "20px 16px",
              borderRadius: 16,
              border: "1.5px solid var(--sv-border)",
              background: "var(--sv-cyan-tint)",
              marginBottom: 12,
              userSelect: "all",
            }}
          >
            {accessCode}
          </div>
          <button
            type="button"
            onClick={() => void copyCode()}
            style={{
              fontFamily: FO,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--sv-teal-mid)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginBottom: 24,
              textDecoration: "underline",
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </>
      )}

      {error && (
        <p
          style={{
            fontFamily: FO,
            fontSize: 14,
            color: "var(--sv-negative)",
            marginBottom: 16,
          }}
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <GameButton
          size="lg"
          style={{ width: "100%" }}
          disabled={!heatId || creating}
          onClick={onEnter}
        >
          Enter heat & play
        </GameButton>
        {error && (
          <GameButton size="md" variant="ghost" style={{ width: "100%" }} onClick={onCreate}>
            Try create again
          </GameButton>
        )}
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: FO,
            fontSize: 13,
            color: "var(--sv-text-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 8,
          }}
        >
          Back
        </button>
      </div>
    </GlassCard>
  );
}

function OfficialScreen({
  isOfficial,
  identity,
  onOfficialChange,
  onIdentityChange,
  onNext,
  onBack,
}: {
  isOfficial: boolean;
  identity: string;
  onOfficialChange: (v: boolean) => void;
  onIdentityChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = !isOfficial || identity.trim().includes("@");

  return (
    <GlassCard className="p-4">
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: "var(--sv-ink)",
          marginBottom: 8,
        }}
      >
        Official or practice?
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 20,
        }}
      >
        Official attempts count once per person for the event. Practice does not lock you out.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <SelectionCard active={!isOfficial} onClick={() => onOfficialChange(false)}>
          <div className="text-left">
            <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 15 }}>Practice</div>
            <div style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 2 }}>
              Unlimited retries. Not ranked as official.
            </div>
          </div>
        </SelectionCard>
        <SelectionCard active={isOfficial} onClick={() => onOfficialChange(true)}>
          <div className="text-left">
            <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 15 }}>Official attempt</div>
            <div style={{ fontFamily: FO, fontSize: 12, color: "var(--sv-text-muted)", marginTop: 2 }}>
              One per email for this heat. Choose carefully.
            </div>
          </div>
        </SelectionCard>
      </div>

      {isOfficial && (
        <>
          <label
            htmlFor="player-identity"
            style={{
              display: "block",
              fontFamily: FO,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--sv-teal-mid)",
              marginBottom: 8,
            }}
          >
            Email (locks one attempt)
          </label>
          <input
            id="player-identity"
            type="email"
            autoComplete="email"
            value={identity}
            onChange={(e) => onIdentityChange(e.target.value)}
            placeholder="you@school.edu"
            style={{
              width: "100%",
              fontFamily: FO,
              fontSize: 16,
              padding: "14px 16px",
              borderRadius: 12,
              border: "2px solid var(--sv-border)",
              background: "rgba(255,255,255,0.8)",
              color: "var(--sv-ink)",
              marginBottom: 20,
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) onNext();
            }}
          />
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "16px",
            borderRadius: 12,
            border: "1.5px solid var(--sv-border)",
            background: "rgba(255,255,255,0.5)",
            fontFamily: FO,
            fontWeight: 600,
            fontSize: 15,
            color: "var(--sv-text-secondary)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <GameButton size="lg" style={{ flex: 1 }} disabled={!canContinue} onClick={onNext}>
          Continue
        </GameButton>
      </div>
    </GlassCard>
  );
}

function LoadingScreen({
  onStart,
  onRetry,
  onHome,
  submitting,
  error,
}: {
  onStart: () => void;
  onRetry: () => void;
  onHome: () => void;
  submitting: boolean;
  error: string | null;
}) {
  useEffect(() => {
    if (!submitting && !error) {
      onStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlassCard className="text-center py-12 px-4">
      {!error && (
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-4 border-t-[var(--sv-teal-mid)] border-b-[var(--sv-teal-mid)] border-l-transparent border-r-transparent rounded-full animate-spin" />
        </div>
      )}
      <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 20, color: "var(--sv-ink)", marginBottom: 8 }}>
        {error
          ? "Couldn’t start"
          : submitting
            ? "Preparing your supply chain..."
            : "Connecting..."}
      </h2>
      {error && (
        <div className="mt-4">
          <p
            style={{
              fontFamily: FO,
              fontSize: 14,
              color: "var(--sv-negative)",
              marginBottom: 16,
              lineHeight: 1.45,
            }}
          >
            {error}
          </p>
          <div className="flex flex-col gap-2">
            <GameButton onClick={onRetry}>Try again</GameButton>
            <GameButton variant="ghost" onClick={onHome}>
              Back to start
            </GameButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ---------------------------------------------------------
// Main flow: Welcome → Identity → Mode → (Heat code) → Play
// ---------------------------------------------------------

export default function OnboardingFlow() {
  const router = useRouter();
  const {
    startSolo,
    joinHeat,
    createHostedHeat,
    submitting,
    error,
    reset,
  } = useAttemptStore();
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [hoverPersona, setHoverPersona] = useState<PersonaSlug | null>(null);
  const [hostedHeat, setHostedHeat] = useState<{
    heat_id: string;
    access_code: string;
  } | null>(null);
  const [hostCreating, setHostCreating] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        if (USE_MOCK) {
          if (!cancelled) setGameConfig(loadAdminConfig());
          return;
        }
        try {
          const remote = await api.getConfiguration("default");
          if (!cancelled) setGameConfig(remote);
        } catch {
          if (!cancelled) setGameConfig(loadAdminConfig());
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const [data, setData] = useState(() => ({
    persona: "" as PersonaSlug | "",
    name: "",
    mode: "solo" as PlayMode,
    heatCode: "",
    isOfficial: false,
    playerIdentity: readSavedIdentity(),
  }));

  const updateData = <K extends keyof typeof data>(key: K, val: (typeof data)[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "mode" && val === "solo") next.isOfficial = false;
      return next;
    });
    // Persist immediately so the play header can show the chosen avatar.
    if (key === "persona" || key === "name") {
      const nextPersona = key === "persona" ? (val as PersonaSlug | "") : data.persona;
      const nextName = key === "name" ? String(val) : data.name;
      if (nextPersona || nextName.trim()) {
        writePlayerProfile({
          persona: nextPersona || null,
          name: nextName.trim() || null,
        });
      }
    }
    if (key === "playerIdentity") {
      saveIdentity(String(val).trim());
    }
    // Changing mode drops any staged host heat so codes don't leak across modes.
    if (key === "mode") {
      setHostedHeat(null);
      setHostError(null);
    }
  };

  const [stepIndex, setStepIndex] = useState(0);
  const next = () => setStepIndex((s) => s + 1);

  const handleCreateHostedHeat = async () => {
    setHostCreating(true);
    setHostError(null);
    try {
      const heat = await createHostedHeat(data.name.trim() || "Host");
      setHostedHeat(heat);
    } catch (e) {
      setHostError(e instanceof Error ? e.message : "Could not create heat");
    } finally {
      setHostCreating(false);
    }
  };

  const allScreens = [
    { id: "welcome", component: <WelcomeScreen config={gameConfig} onNext={next} /> },
    {
      id: "identity",
      component: (
        <IdentityScreen
          persona={data.persona}
          name={data.name}
          onPersonaChange={(v) => updateData("persona", v)}
          onNameChange={(v) => updateData("name", v)}
          onNext={next}
          onHoverPersona={setHoverPersona}
        />
      ),
    },
    {
      id: "mode",
      component: (
        <ModeScreen
          value={data.mode}
          onChange={(v) => updateData("mode", v)}
          onNext={next}
        />
      ),
    },
    ...(data.mode === "heat"
      ? [
          {
            id: "heatCode",
            component: (
              <HeatCodeScreen
                value={data.heatCode}
                onChange={(v) => updateData("heatCode", v)}
                onNext={next}
                onBack={() => setStepIndex((s) => Math.max(0, s - 1))}
              />
            ),
          },
        ]
      : []),
    ...(data.mode === "host"
      ? [
          {
            id: "hostShare",
            component: (
              <HostShareScreen
                accessCode={hostedHeat?.access_code ?? null}
                heatId={hostedHeat?.heat_id ?? null}
                creating={hostCreating || submitting}
                error={hostError || error}
                onCreate={() => void handleCreateHostedHeat()}
                onEnter={next}
                onBack={() => {
                  setHostedHeat(null);
                  setHostError(null);
                  setStepIndex((s) => Math.max(0, s - 1));
                }}
              />
            ),
          },
        ]
      : []),
    ...(data.mode === "host" || data.mode === "heat"
      ? [
          {
            id: "official",
            component: (
              <OfficialScreen
                isOfficial={data.isOfficial}
                identity={data.playerIdentity}
                onOfficialChange={(v) => updateData("isOfficial", v)}
                onIdentityChange={(v) => updateData("playerIdentity", v)}
                onNext={next}
                onBack={() => setStepIndex((s) => Math.max(0, s - 1))}
              />
            ),
          },
        ]
      : []),
    {
      id: "loading",
      component: (
        <LoadingScreen
          submitting={submitting}
          error={error}
          onHome={() => {
            reset();
            setStepIndex(0);
          }}
          onRetry={() => {
            // Re-fire start by remounting loading via step nudge
            void (async () => {
              const player = data.name.trim() || "Player";
              writePlayerProfile({ persona: data.persona || null, name: player });
              try {
                if (data.mode === "solo") {
                  reset();
                  const id = await startSolo(player);
                  router.push(`/play/${id}`);
                } else if (data.mode === "host") {
                  if (!hostedHeat?.heat_id) throw new Error("Heat not ready");
                  const id = await joinHeat(hostedHeat.heat_id, player, {
                    is_official: data.isOfficial,
                    player_identity: data.playerIdentity.trim(),
                  });
                  router.push(`/play/${id}`);
                } else {
                  const id = await joinHeat(data.heatCode.trim(), player, {
                    is_official: data.isOfficial,
                    player_identity: data.playerIdentity.trim(),
                  });
                  router.push(`/play/${id}`);
                }
              } catch (err) {
                console.error(err);
              }
            })();
          }}
          onStart={async () => {
            const player = data.name.trim() || "Player";
            writePlayerProfile({
              persona: data.persona || null,
              name: player,
            });
            try {
              if (data.mode === "solo") {
                reset();
                const id = await startSolo(player);
                router.push(`/play/${id}`);
              } else if (data.mode === "host") {
                if (!hostedHeat?.heat_id) {
                  throw new Error("Heat not ready — go back and create a code");
                }
                const id = await joinHeat(hostedHeat.heat_id, player, {
                  is_official: data.isOfficial,
                  player_identity: data.playerIdentity.trim(),
                });
                router.push(`/play/${id}`);
              } else {
                const id = await joinHeat(data.heatCode.trim(), player, {
                  is_official: data.isOfficial,
                  player_identity: data.playerIdentity.trim(),
                });
                router.push(`/play/${id}`);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        />
      ),
    },
  ];

  const safeIndex = Math.min(stepIndex, allScreens.length - 1);
  const stepId = allScreens[safeIndex].id;
  const progress = ((safeIndex + 1) / allScreens.length) * 100;
  const CurrentScreen = allScreens[safeIndex].component;

  const coachLine = useMemo(() => {
    if (stepId === "identity") {
      const slug = hoverPersona || data.persona || null;
      return personaBySlug(slug)?.coachLine ?? COACH_LINES.identity;
    }
    return COACH_LINES[stepId] ?? COACH_LINES.welcome;
  }, [stepId, hoverPersona, data.persona]);

  const showCoach = stepId !== "loading";

  return (
    <GridBackground>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: 4,
          background: "var(--sv-border)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--sv-teal-mid)",
            transition: "width 0.4s ease-out",
          }}
        />
      </div>

      <main className="mx-auto w-full max-w-[1040px] px-5 sm:px-8 py-10 sm:py-12 min-h-screen flex flex-col justify-center">
        <div
          className={
            showCoach
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] gap-8 lg:gap-6 items-center"
              : "w-full"
          }
        >
          {/* Interactive column — centered, stable height (no coach dialogue here) */}
          <section className="flex min-w-0 flex-col gap-5 w-full max-w-[480px] mx-auto">
            <PageTransition key={stepId}>{CurrentScreen}</PageTransition>

            {safeIndex === 0 && (
              <a
                href="/admin"
                style={{
                  fontFamily: FO,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--sv-text-muted)",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                Admin controls
              </a>
            )}

            {safeIndex > 0 &&
              safeIndex < allScreens.length - 1 &&
              stepId !== "heatCode" &&
              stepId !== "hostShare" &&
              stepId !== "official" && (
                <button
                  type="button"
                  onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                  style={{
                    fontFamily: FO,
                    fontSize: 13,
                    color: "var(--sv-text-muted)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    alignSelf: "center",
                  }}
                >
                  Back
                </button>
              )}
          </section>

          {/* Coach + bubble as one right-side unit */}
          {showCoach && (
            <div className="flex justify-center lg:justify-end self-center order-first lg:order-none">
              <CoachSpeech line={coachLine} messageKey={stepId} size="lg" />
            </div>
          )}
        </div>
      </main>
    </GridBackground>
  );
}
