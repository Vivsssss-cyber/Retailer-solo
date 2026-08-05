"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  PERSONA_AVATAR_PLACEHOLDER,
  PERSONAS,
  personaBySlug,
  type PersonaSlug,
} from "@/lib/personas";
import { readPlayerProfile, writePlayerProfile } from "@/lib/playerProfile";
import { CoachSpeech } from "@/components/coach";
import { OnboardingWarehouseTour } from "@/components/onboarding/OnboardingWarehouseTour";
import { hasCompletedPlayTour } from "@/lib/playTour";

// ---------------------------------------------------------
// Coach lines
// ---------------------------------------------------------

const COACH_LINES: Record<string, string> = {
  welcome: "I'm your coach. Before we open the warehouse — let's get you set up.",
  mode: "Solo practice is the fastest path. Host or join when you're playing with a group.",
  practiceFast: "Pick a face and a name — cosmetic only. Then we open the warehouse.",
  identity:
    "Avatar and name are cosmetic only — they never change scoring or fairness.",
  heatCode: "Ask your host for the code. Then we can join the heat.",
  hostShare:
    "Share the big code or the QR with your class. Wait for players, then enter.",
  official:
    "Official is one attempt per email — permanent for this heat. Practice is unlimited.",
  officialConfirm:
    "Last chance. Official cannot be undone for this email on this heat.",
  tutorial: "I'll spotlight the warehouse — inventory, history, charts, and your order dock.",
  loading: "Locking in your setup. Warehouse opens in a second…",
};

type PlayMode = "solo" | "host" | "heat";

const IDENTITY_KEY = "retailer-challenge-player-identity";
const DEFAULT_PERSONA: PersonaSlug = "the-analyst";

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

function readQueryHeatCode(): string {
  if (typeof window === "undefined") return "";
  try {
    const code = new URLSearchParams(window.location.search).get("code");
    return code ? code.trim().toUpperCase() : "";
  } catch {
    return "";
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}

// ---------------------------------------------------------
// Screens
// ---------------------------------------------------------

function WelcomeScreen({ onNext, config }: { onNext: () => void; config: GameConfig }) {
  // Full unit label with plural (avoid "2 rou" from slice(0,3) on "Round")
  const unitBase = (config.timeline_unit || "Round").toLowerCase();
  const unitLabel =
    config.delivery_delay === 1
      ? unitBase
      : unitBase.endsWith("s")
        ? unitBase
        : `${unitBase}s`;
  return (
    <GlassCard className="text-center relative overflow-hidden p-4">
      <div className="flex justify-center mb-6">
        <Image
          src="/cyan-logo.svg"
          alt="CYAN"
          width={64}
          height={64}
          unoptimized
          style={{ width: "auto", height: "auto", maxWidth: 64, maxHeight: 64 }}
        />
      </div>
      <h1
        className="text-[clamp(1.35rem,5.2vw,2rem)] sm:text-[32px]"
        style={{
          fontFamily: FO,
          fontWeight: 800,
          color: "var(--sv-ink)",
          marginBottom: 16,
          lineHeight: 1.15,
          letterSpacing: "-0.5px",
          whiteSpace: "nowrap",
        }}
      >
        Master your Supply Chain
      </h1>
      <p
        style={{
          fontFamily: FO,
          fontSize: 16,
          color: "var(--sv-text-secondary)",
          marginBottom: 32,
        }}
      >
        Step into the shoes of a supply chain manager. Can you balance costs and satisfy
        demand?
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
          value={`${config.delivery_delay} ${unitLabel}`}
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
      blurb: "Fastest path — name, coach walkthrough, play.",
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
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: "var(--sv-ink)",
          marginBottom: 24,
        }}
      >
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
                <div
                  style={{
                    fontFamily: FO,
                    fontSize: 12,
                    color: "var(--sv-text-muted)",
                    marginTop: 2,
                  }}
                >
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

/** Solo practice fast path: avatar + name on one screen → start. */
function PracticeFastScreen({
  persona,
  name,
  onPersonaChange,
  onNameChange,
  onStart,
  onBack,
  onHoverPersona,
}: {
  persona: PersonaSlug | "";
  name: string;
  onPersonaChange: (slug: PersonaSlug) => void;
  onNameChange: (v: string) => void;
  onStart: () => void;
  onBack: () => void;
  onHoverPersona?: (slug: PersonaSlug | null) => void;
}) {
  const selected = personaBySlug(persona);
  const canStart = !!persona && name.trim().length > 0;

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
        Practice run
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 8,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        Pick a face and a name — then start. One screen, no extra steps.
      </p>
      <p
        style={{
          fontFamily: FO,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--sv-teal-mid)",
          marginBottom: 20,
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        Cosmetic — never affects score or fairness
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
              onPointerDown={(e) => {
                // Instant select on press (no double-tap feel on touch).
                if (e.pointerType === "touch" || e.pointerType === "pen") {
                  onPersonaChange(p.slug);
                }
              }}
              onMouseEnter={() => onHoverPersona?.(p.slug)}
              onFocus={() => onHoverPersona?.(p.slug)}
              className="touch-manipulation select-none"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                borderRadius: 14,
                border: active
                  ? "2.5px solid var(--sv-teal-mid)"
                  : "1.5px solid var(--sv-border)",
                background: active ? "var(--sv-cyan-tint)" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                // Only animate inactive hover — active state is instant
                transition: active
                  ? "none"
                  : "border-color 0.12s ease, background 0.12s ease",
                boxShadow: active
                  ? "0 0 0 3px color-mix(in srgb, var(--sv-teal-mid) 22%, transparent)"
                  : "none",
                transform: active ? "scale(1.02)" : "scale(1)",
                WebkitTapHighlightColor: "transparent",
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
                  pointerEvents: "none",
                }}
              >
                <Image
                  src={p.avatarSrc}
                  alt=""
                  width={108}
                  height={108}
                  unoptimized
                  draggable={false}
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
        htmlFor="practice-name"
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
        id="practice-name"
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
          if (e.key === "Enter" && canStart) onStart();
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
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
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
                color: "var(--sv-text-muted)",
                margin: 0,
              }}
            >
              Board label only
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <BackButton onClick={onBack} />
        <GameButton size="lg" style={{ flex: 1 }} disabled={!canStart} onClick={onStart}>
          Start practice
        </GameButton>
      </div>
    </GlassCard>
  );
}

/** Combined avatar + name — heat/host path only. */
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
          marginBottom: 8,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        Avatar and name for the board only.
      </p>
      <p
        style={{
          fontFamily: FO,
          fontSize: 12,
          fontWeight: 700,
          color: "var(--sv-teal-mid)",
          marginBottom: 20,
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        Cosmetic — never affects score or fairness
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
              onPointerDown={(e) => {
                if (e.pointerType === "touch" || e.pointerType === "pen") {
                  onPersonaChange(p.slug);
                }
              }}
              onMouseEnter={() => onHoverPersona?.(p.slug)}
              onFocus={() => onHoverPersona?.(p.slug)}
              className="touch-manipulation select-none"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                borderRadius: 14,
                border: active
                  ? "2.5px solid var(--sv-teal-mid)"
                  : "1.5px solid var(--sv-border)",
                background: active ? "var(--sv-cyan-tint)" : "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: active
                  ? "none"
                  : "border-color 0.12s ease, background 0.12s ease",
                boxShadow: active
                  ? "0 0 0 3px color-mix(in srgb, var(--sv-teal-mid) 22%, transparent)"
                  : "none",
                transform: active ? "scale(1.02)" : "scale(1)",
                WebkitTapHighlightColor: "transparent",
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
                  pointerEvents: "none",
                }}
              >
                <Image
                  src={p.avatarSrc}
                  alt=""
                  width={108}
                  height={108}
                  unoptimized
                  draggable={false}
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
            style={{
              width: 40,
              height: 40,
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
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
                color: "var(--sv-text-muted)",
                margin: 0,
              }}
            >
              Board label only
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
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 24,
          color: "var(--sv-ink)",
          marginBottom: 8,
        }}
      >
        Enter Heat Code
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 24,
        }}
      >
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
        <BackButton onClick={onBack} />
        <GameButton size="lg" style={{ flex: 1 }} disabled={!value.trim()} onClick={onNext}>
          Continue
        </GameButton>
      </div>
    </GlassCard>
  );
}

/** Host path: big code, copy, QR, waiting for players. */
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
  const [linkCopied, setLinkCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  /** Guard Strict Mode double-mount so we only POST one heat. */
  const createOnceRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (accessCode || creating || createOnceRef.current) return;
    createOnceRef.current = true;
    onCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once on mount
  }, [accessCode, creating]);

  const joinUrl =
    accessCode && origin
      ? `${origin}/?code=${encodeURIComponent(accessCode)}`
      : accessCode
        ? `code=${accessCode}`
        : "";

  const qrSrc =
    accessCode &&
    `https://api.qrserver.com/v1/create-qr-code/?size=168x168&margin=8&data=${encodeURIComponent(
      joinUrl || accessCode,
    )}`;

  const copyCode = async () => {
    if (!accessCode) return;
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyLink = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* ignore */
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
        Share your heat
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 16,
          lineHeight: 1.45,
        }}
      >
        Project this screen. Up to 4 players can join, including you.
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
          Mock mode: this code only works in <strong>this browser</strong>. For classmates
          on other devices, set{" "}
          <code style={{ fontSize: 11 }}>NEXT_PUBLIC_USE_MOCK=false</code> and restart.
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
              fontSize: "clamp(2rem, 8vw, 2.75rem)",
              letterSpacing: "0.2em",
              color: "var(--sv-teal-mid)",
              padding: "24px 16px",
              borderRadius: 16,
              border: "2px solid var(--sv-teal-mid)",
              background: "var(--sv-cyan-tint)",
              marginBottom: 12,
              userSelect: "all",
              lineHeight: 1.1,
            }}
            aria-label={`Heat code ${accessCode}`}
          >
            {accessCode}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-5">
            <GameButton size="md" style={{ flex: 1 }} onClick={() => void copyCode()}>
              {copied ? "Copied!" : "Copy code"}
            </GameButton>
            <GameButton
              size="md"
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => void copyLink()}
              disabled={!joinUrl}
            >
              {linkCopied ? "Link copied!" : "Copy join link"}
            </GameButton>
          </div>

          {qrSrc && (
            <div
              className="mx-auto mb-4 p-3 rounded-2xl inline-block"
              style={{
                border: "1.5px solid var(--sv-border)",
                background: "white",
              }}
            >
              {/* External QR image — classroom share; no new npm dep */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR code for heat ${accessCode}`}
                width={168}
                height={168}
                style={{ display: "block", imageRendering: "pixelated" }}
              />
              <p
                style={{
                  fontFamily: FO,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--sv-text-muted)",
                  marginTop: 8,
                  marginBottom: 0,
                }}
              >
                Scan to open join link
              </p>
            </div>
          )}

          <div
            className="mb-5 p-3 rounded-xl text-left"
            style={{
              border: "1.5px dashed var(--sv-border)",
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <p
              style={{
                fontFamily: FO,
                fontSize: 12,
                fontWeight: 700,
                color: "var(--sv-teal-mid)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 6px",
              }}
            >
              Waiting for players
            </p>
            <p
              style={{
                fontFamily: FO,
                fontSize: 13,
                color: "var(--sv-text-secondary)",
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Classmates open the home screen → Join a Heat → enter this code (or scan the
              QR). When the room is ready, enter and play.
            </p>
          </div>
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
  const [ackOfficial, setAckOfficial] = useState(false);
  const emailOk = !isOfficial || identity.trim().includes("@");
  const canContinue = emailOk && (!isOfficial || ackOfficial);

  const pickPractice = () => {
    setAckOfficial(false);
    onOfficialChange(false);
  };
  const pickOfficial = () => onOfficialChange(true);

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
          lineHeight: 1.45,
        }}
      >
        Official attempts count once per person for the event. Practice does not lock you
        out.
      </p>

      <div className="flex flex-col gap-3 mb-6">
        <SelectionCard active={!isOfficial} onClick={pickPractice}>
          <div className="text-left">
            <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 15 }}>Practice</div>
            <div
              style={{
                fontFamily: FO,
                fontSize: 12,
                color: "var(--sv-text-muted)",
                marginTop: 2,
              }}
            >
              Unlimited retries. Not ranked as official.
            </div>
          </div>
        </SelectionCard>
        <SelectionCard active={isOfficial} onClick={pickOfficial}>
          <div className="text-left">
            <div style={{ fontFamily: FO, fontWeight: 600, fontSize: 15 }}>
              Official attempt
            </div>
            <div
              style={{
                fontFamily: FO,
                fontSize: 12,
                color: "var(--sv-text-muted)",
                marginTop: 2,
              }}
            >
              One per email for this heat. Cannot be undone.
            </div>
          </div>
        </SelectionCard>
      </div>

      {isOfficial && (
        <>
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl text-left"
            style={{
              border: "1.5px solid var(--sv-warning)",
              background: "rgba(180, 83, 9, 0.08)",
            }}
          >
            <p
              style={{
                fontFamily: FO,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--sv-warning)",
                margin: "0 0 6px",
              }}
            >
              This cannot be undone
            </p>
            <p
              style={{
                fontFamily: FO,
                fontSize: 13,
                color: "var(--sv-text-secondary)",
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Starting an official attempt locks this email for the heat. You will not get a
              second official try if you mis-order or refresh mid-game.
            </p>
          </div>

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
              marginBottom: 14,
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) onNext();
            }}
          />

          <label
            className="flex items-start gap-2.5 mb-5 cursor-pointer text-left"
            style={{ fontFamily: FO }}
          >
            <input
              type="checkbox"
              checked={ackOfficial}
              onChange={(e) => setAckOfficial(e.target.checked)}
              style={{ marginTop: 3, accentColor: "var(--sv-teal-mid)" }}
            />
            <span style={{ fontSize: 13, color: "var(--sv-ink)", lineHeight: 1.4 }}>
              I understand this is my only official attempt for this heat with this email.
            </span>
          </label>
        </>
      )}

      <div className="flex gap-2">
        <BackButton onClick={onBack} />
        <GameButton size="lg" style={{ flex: 1 }} disabled={!canContinue} onClick={onNext}>
          {isOfficial ? "Lock in & continue" : "Continue"}
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
  onStart: () => void | Promise<void>;
  onRetry: () => void | Promise<void>;
  onHome: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const startedRef = React.useRef(false);
  useEffect(() => {
    // Dev Strict Mode runs effects twice on the same instance — fire start once.
    if (startedRef.current) return;
    startedRef.current = true;
    void onStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per visit to this step
  }, []);

  return (
    <GlassCard className="text-center py-12 px-4">
      {!error && (
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 border-4 border-t-[var(--sv-teal-mid)] border-b-[var(--sv-teal-mid)] border-l-transparent border-r-transparent rounded-full animate-spin" />
        </div>
      )}
      <h2
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 20,
          color: "var(--sv-ink)",
          marginBottom: 8,
        }}
      >
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
            <GameButton
              onClick={() => {
                void onRetry();
              }}
            >
              Try again
            </GameButton>
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
// Main flow
// Welcome → Mode →
//   solo: PracticeFast → [Tutorial?] → Loading
//   host: Identity → HostShare → Official → [Tutorial?] → Loading
//   heat: Identity → HeatCode → Official → [Tutorial?] → Loading
// ---------------------------------------------------------

export default function OnboardingFlow() {
  const router = useRouter();
  const { startSolo, joinHeat, createHostedHeat, submitting, error, reset } =
    useAttemptStore();
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [hoverPersona, setHoverPersona] = useState<PersonaSlug | null>(null);
  const [hostedHeat, setHostedHeat] = useState<{
    heat_id: string;
    access_code: string;
  } | null>(null);
  const [hostCreating, setHostCreating] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  /**
   * Focused-element warehouse tour (dark overlay + spotlights).
   * Same PlayTour as in-game How to play — runs once during onboarding.
   * Default "skip" on SSR so progress bar width matches client hydrate;
   * promote to "needed" after mount when tour not yet completed.
   */
  const [tutorialGate, setTutorialGate] = useState<"needed" | "skip">("skip");

  useEffect(() => {
    if (!hasCompletedPlayTour()) setTutorialGate("needed");
  }, []);

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

  const [data, setData] = useState(() => {
    if (typeof window === "undefined") {
      return {
        persona: "" as PersonaSlug | "",
        name: "",
        mode: "solo" as PlayMode,
        heatCode: "",
        isOfficial: false,
        playerIdentity: "",
      };
    }
    const profile = readPlayerProfile();
    const code = readQueryHeatCode();
    return {
      persona: (profile.persona ?? "") as PersonaSlug | "",
      name: profile.name ?? "",
      mode: (code ? "heat" : "solo") as PlayMode,
      heatCode: code,
      isOfficial: false,
      playerIdentity: readSavedIdentity(),
    };
  });

  // welcome(0) → mode(1) → identity(2) when joining via QR/link
  // Always start at 0 for SSR hydrate parity; jump after mount if ?code= present.
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (readQueryHeatCode()) setStepIndex(2);
  }, []);

  const updateData = <K extends keyof typeof data>(key: K, val: (typeof data)[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "mode" && val === "solo") next.isOfficial = false;
      return next;
    });
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
    if (key === "mode") {
      setHostedHeat(null);
      setHostError(null);
    }
  };

  const next = () => setStepIndex((s) => s + 1);
  const back = () => setStepIndex((s) => Math.max(0, s - 1));

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

  /** Ensure practice has a default persona without forcing the picker. */
  const ensurePracticeProfile = () => {
    const player = data.name.trim() || "Player";
    const profile = readPlayerProfile();
    const persona = data.persona || profile.persona || DEFAULT_PERSONA;
    writePlayerProfile({ persona, name: player });
    if (!data.persona) {
      setData((prev) => ({ ...prev, persona }));
    }
    return player;
  };

  const runStart = async () => {
    const player =
      data.mode === "solo"
        ? ensurePracticeProfile()
        : data.name.trim() || "Player";
    const profile = readPlayerProfile();
    writePlayerProfile({
      persona: data.persona || profile.persona || DEFAULT_PERSONA,
      name: player,
    });
    try {
      if (data.mode === "solo") {
        const id = await startSolo(player);
        router.push(`/play/${id}`);
        return;
      }
      if (data.mode === "host") {
        const key =
          hostedHeat?.access_code ||
          hostedHeat?.heat_id ||
          useAttemptStore.getState().heatAccessCode;
        if (!key) {
          throw new Error("Heat not ready — go back and create a code");
        }
        const id = await joinHeat(key, player, {
          is_official: data.isOfficial,
          player_identity: data.playerIdentity.trim(),
        });
        router.push(`/play/${id}`);
        return;
      }
      const code = data.heatCode.trim();
      if (!code) {
        throw new Error("Enter a heat code first.");
      }
      const id = await joinHeat(code, player, {
        is_official: data.isOfficial,
        player_identity: data.playerIdentity.trim(),
      });
      router.push(`/play/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  /** Advance into tutorial (if needed) or loading — tutorial is only in the stack when needed. */
  const goToPlayOrTutorial = () => next();

  const showTutorial = tutorialGate === "needed";

  const allScreens = useMemo(() => {
    type Screen = { id: string; component: React.ReactNode };
    const screens: Screen[] = [
      { id: "welcome", component: <WelcomeScreen config={gameConfig} onNext={next} /> },
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
    ];

    if (data.mode === "solo") {
      screens.push({
        id: "practiceFast",
        component: (
          <PracticeFastScreen
            persona={data.persona}
            name={data.name}
            onPersonaChange={(v) => updateData("persona", v)}
            onNameChange={(v) => updateData("name", v)}
            onStart={() => {
              ensurePracticeProfile();
              goToPlayOrTutorial();
            }}
            onBack={back}
            onHoverPersona={setHoverPersona}
          />
        ),
      });
    } else {
      screens.push({
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
      });

      if (data.mode === "heat") {
        screens.push({
          id: "heatCode",
          component: (
            <HeatCodeScreen
              value={data.heatCode}
              onChange={(v) => updateData("heatCode", v)}
              onNext={next}
              onBack={back}
            />
          ),
        });
      }

      if (data.mode === "host") {
        screens.push({
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
                back();
              }}
            />
          ),
        });
      }

      screens.push({
        id: "official",
        component: (
          <OfficialScreen
            isOfficial={data.isOfficial}
            identity={data.playerIdentity}
            onOfficialChange={(v) => updateData("isOfficial", v)}
            onIdentityChange={(v) => updateData("playerIdentity", v)}
            onNext={goToPlayOrTutorial}
            onBack={back}
          />
        ),
      });
    }

    if (showTutorial) {
      screens.push({
        id: "tutorial",
        component: (
          <OnboardingWarehouseTour
            config={gameConfig}
            onComplete={next}
          />
        ),
      });
    }

    screens.push({
      id: "loading",
      component: (
        <LoadingScreen
          submitting={submitting}
          error={error}
          onHome={() => {
            reset();
            setHostedHeat(null);
            setHostError(null);
            setStepIndex(0);
          }}
          onRetry={() => void runStart()}
          onStart={() => void runStart()}
        />
      ),
    });

    return screens;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when flow inputs change
  }, [
    gameConfig,
    data.mode,
    data.name,
    data.persona,
    data.heatCode,
    data.isOfficial,
    data.playerIdentity,
    hostedHeat,
    hostCreating,
    hostError,
    submitting,
    error,
    showTutorial,
    tutorialGate,
  ]);

  // Keep index valid when mode changes screen count
  const safeIndex = Math.min(stepIndex, Math.max(0, allScreens.length - 1));
  const stepId = allScreens[safeIndex]?.id ?? "welcome";
  const progress = ((safeIndex + 1) / allScreens.length) * 100;
  const CurrentScreen = allScreens[safeIndex]?.component;

  const coachLine = useMemo(() => {
    if (stepId === "identity" || stepId === "practiceFast") {
      const slug = hoverPersona || data.persona || null;
      return (
        personaBySlug(slug)?.coachLine ??
        (stepId === "practiceFast" ? COACH_LINES.practiceFast : COACH_LINES.identity)
      );
    }
    return COACH_LINES[stepId] ?? COACH_LINES.welcome;
  }, [stepId, hoverPersona, data.persona]);

  // Warehouse tour has its own coach + dark overlay — hide side mascot.
  const showCoach = stepId !== "loading" && stepId !== "tutorial";

  // Screens that already have their own Back control
  const hasInlineBack =
    stepId === "heatCode" ||
    stepId === "hostShare" ||
    stepId === "official" ||
    stepId === "practiceFast" ||
    stepId === "tutorial";

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

      <main className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 py-6 sm:py-12 min-h-dvh flex flex-col justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div
          className={
            showCoach
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] gap-5 sm:gap-8 lg:gap-6 items-center"
              : "w-full"
          }
        >
          <section
            className={[
              "flex min-w-0 flex-col gap-5 w-full mx-auto",
              stepId === "tutorial" ? "max-w-[720px]" : "max-w-[480px]",
            ].join(" ")}
          >
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

            {safeIndex > 0 && safeIndex < allScreens.length - 1 && !hasInlineBack && (
              <button
                type="button"
                onClick={back}
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

          {showCoach && (
            <div className="flex w-full max-w-full justify-center self-center order-first px-1 sm:px-0 sm:max-w-none lg:order-none lg:w-auto lg:justify-end">
              <CoachSpeech line={coachLine} messageKey={stepId} size="lg" />
            </div>
          )}
        </div>
      </main>
    </GridBackground>
  );
}
