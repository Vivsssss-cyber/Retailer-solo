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
  DollarSign,
} from "@/components/cyan/PixelIcons";
import { useAttemptStore } from "@/store/useAttemptStore";
import { DEFAULT_CONFIG, type GameConfig } from "@/engine";
import { loadAdminConfig } from "@/lib/adminConfigStore";
import { api, USE_MOCK } from "@/services/api";
import {
  personaBySlug,
  type CoachExpression,
  type PersonaSlug,
} from "@/lib/personas";
import { readPlayerProfile, writePlayerProfile } from "@/lib/playerProfile";
import { CoachSpeech } from "@/components/coach";
import { OnboardingWarehouseTour } from "@/components/onboarding/OnboardingWarehouseTour";
import { PersonaPicker } from "@/components/onboarding/PersonaPicker";
import { hasCompletedPlayTour } from "@/lib/playTour";

// ---------------------------------------------------------
// Coach lines
// ---------------------------------------------------------

const COACH_LINES: Record<string, string> = {
  welcome: "I'm your coach. Before we open the warehouse — let's get you set up.",
  mode: "Join a group with the code from your instructor. Solo practice only if they enabled it.",
  practiceFast: "Pick a persona and a name — cosmetic only. Then we open the warehouse.",
  identity: "Pick a persona and a name — cosmetic only. Never changes scoring.",
  heatCode: "Enter the group code. Next screen you pick a persona and name.",
  official:
    "Official is one attempt per email — permanent for this group. Practice is unlimited.",
  officialConfirm:
    "Last chance. Official cannot be undone for this email on this group.",
  tutorial: "I'll spotlight the warehouse — inventory, history, charts, and your order dock.",
  loading: "Locking in your setup. Warehouse opens in a second…",
};

/** Pose per onboarding beat — matches message intent, not just tip/warn tones. */
const COACH_EXPRESSIONS_BY_STEP: Record<string, CoachExpression> = {
  welcome: "neutral",
  mode: "explain",
  practiceFast: "explain",
  identity: "explain",
  heatCode: "thinking",
  official: "thinking",
  officialConfirm: "alert",
  tutorial: "explain",
  loading: "thinking",
};

type PlayMode = "solo" | "heat";

const DEFAULT_PERSONA: PersonaSlug = "the-analyst";

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
  soloEnabled,
}: {
  value: PlayMode;
  onChange: (v: PlayMode) => void;
  onNext: () => void;
  soloEnabled: boolean;
}) {
  const options: {
    id: PlayMode;
    title: string;
    blurb: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "heat",
      title: "Join a Group",
      blurb: "Enter a code from your facilitator (or open their join link).",
      icon: <Package size={20} color="currentColor" />,
    },
  ];
  if (soloEnabled) {
    options.push({
      id: "solo",
      title: "Solo Practice",
      blurb: "Private practice — not ranked with a classroom group.",
      icon: <Target size={20} color="currentColor" />,
    });
  }

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

/** Solo practice fast path: persona face + display name → start. */
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
        Pick a persona and a display name — then start.
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
        Persona
      </span>
      <PersonaPicker
        value={persona}
        onChange={onPersonaChange}
        onHover={onHoverPersona}
      />

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
          marginBottom: 20,
          outline: "none",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canStart) onStart();
        }}
      />

      <div className="flex gap-2">
        <BackButton onClick={onBack} />
        <GameButton size="lg" style={{ flex: 1 }} disabled={!canStart} onClick={onStart}>
          Start practice
        </GameButton>
      </div>
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
        Enter group code
      </h2>
      <p
        style={{
          fontFamily: FO,
          fontSize: 14,
          color: "var(--sv-text-secondary)",
          marginBottom: 24,
        }}
      >
        Ask your facilitator for the group code, or open the join link they shared. You can
        add your name after you join.
      </p>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="e.g. ABCD2345"
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
// Welcome → [Mode if solo practice enabled] →
//   solo: PracticeFast → [Tutorial?] → Loading
//   group: GroupCode → redirects to /join/[code] (name optional there)
// Groups are admin-created only.
// ---------------------------------------------------------

export default function OnboardingFlow() {
  const router = useRouter();
  const { startSolo, submitting, error, reset } = useAttemptStore();
  const [gameConfig, setGameConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [hoverPersona, setHoverPersona] = useState<PersonaSlug | null>(null);
  /**
   * Focused-element warehouse tour (dark overlay + spotlights).
   * Same PlayTour as in-game How to play — runs once during onboarding.
   * Default "skip" on SSR so progress bar width matches client hydrate;
   * promote to "needed" after mount when tour not yet completed.
   */
  const [tutorialGate, setTutorialGate] = useState<"needed" | "skip">("skip");

  const soloPracticeEnabled = gameConfig.solo_practice_enabled === true;

  useEffect(() => {
    // Defer past hydrate so progress-bar width matches SSR first paint.
    const id = window.requestAnimationFrame(() => {
      if (!hasCompletedPlayTour()) setTutorialGate("needed");
    });
    return () => window.cancelAnimationFrame(id);
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

  // Empty defaults for SSR/hydrate parity; hydrate from storage after mount.
  // Default: join group. Solo only when admin enables it.
  const [data, setData] = useState({
    persona: "" as PersonaSlug | "",
    name: "",
    mode: "heat" as PlayMode,
    heatCode: "",
  });

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const profile = readPlayerProfile();
      const soloOn = loadAdminConfig().solo_practice_enabled === true;
      setData((prev) => ({
        ...prev,
        persona: (profile.persona ?? prev.persona) as PersonaSlug | "",
        name: profile.name ?? prev.name,
        mode: soloOn ? prev.mode : "heat",
      }));
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!soloPracticeEnabled && data.mode === "solo") {
      setData((prev) => ({ ...prev, mode: "heat" }));
    }
  }, [soloPracticeEnabled, data.mode]);

  const updateData = <K extends keyof typeof data>(key: K, val: (typeof data)[K]) => {
    setData((prev) => {
      // Explicit spread keeps all OnboardingData keys typed after generic key updates.
      const next = { ...prev, [key]: val } as typeof prev;

      // Persist persona/name from the *next* state (avoid stale closures wiping fields).
      if (key === "persona" || key === "name") {
        const nextPersona = next.persona;
        const nextName = next.name.trim();
        if (nextPersona || nextName) {
          writePlayerProfile({
            persona: nextPersona || null,
            // Only clear name when the user explicitly edits the name field to empty.
            name:
              key === "name"
                ? nextName || null
                : nextName || readPlayerProfile().name,
          });
        }
      }

      return next;
    });
  };

  const next = () => setStepIndex((s) => s + 1);
  const back = () => setStepIndex((s) => Math.max(0, s - 1));

  /** Ensure practice has persona + display name before start. */
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

  const goToJoinRoom = () => {
    const code = data.heatCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/join/${encodeURIComponent(code)}`);
  };

  const runStart = async () => {
    if (!soloPracticeEnabled) {
      setData((prev) => ({ ...prev, mode: "heat" }));
      return;
    }
    const player = ensurePracticeProfile();
    try {
      const id = await startSolo(player);
      router.push(`/play/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  /** Advance into tutorial (if needed) or loading — tutorial is only in the stack when needed. */
  const goToPlayOrTutorial = () => next();

  const showTutorial = tutorialGate === "needed";
  const showModeScreen = soloPracticeEnabled;
  const effectiveMode: PlayMode =
    soloPracticeEnabled && data.mode === "solo" ? "solo" : "heat";

  const allScreens = useMemo(() => {
    type Screen = { id: string; component: React.ReactNode };
    const screens: Screen[] = [
      { id: "welcome", component: <WelcomeScreen config={gameConfig} onNext={next} /> },
    ];

    if (showModeScreen) {
      screens.push({
        id: "mode",
        component: (
          <ModeScreen
            value={effectiveMode}
            onChange={(v) => updateData("mode", v)}
            onNext={next}
            soloEnabled={soloPracticeEnabled}
          />
        ),
      });
    }

    if (effectiveMode === "solo") {
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
              setStepIndex(0);
            }}
            onRetry={() => void runStart()}
            onStart={() => void runStart()}
          />
        ),
      });
    } else {
      // Join a group: enter code → /join/[code] (name optional there)
      screens.push({
        id: "heatCode",
        component: (
          <HeatCodeScreen
            value={data.heatCode}
            onChange={(v) => updateData("heatCode", v)}
            onNext={goToJoinRoom}
            onBack={back}
          />
        ),
      });
    }

    return screens;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when flow inputs change
  }, [
    gameConfig,
    effectiveMode,
    showModeScreen,
    soloPracticeEnabled,
    data.name,
    data.persona,
    data.heatCode,
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

  const coachExpression = useMemo((): CoachExpression => {
    // Persona pick feedback — coach reacts to the choice.
    if (stepId === "identity" || stepId === "practiceFast") {
      if (hoverPersona || data.persona) return "celebrate";
      return "explain";
    }
    return COACH_EXPRESSIONS_BY_STEP[stepId] ?? "neutral";
  }, [stepId, hoverPersona, data.persona]);

  // Warehouse tour has its own coach + dark overlay — hide side mascot.
  const showCoach = stepId !== "loading" && stepId !== "tutorial";

  // Screens that already have their own Back control
  const hasInlineBack =
    stepId === "heatCode" ||
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
              <CoachSpeech
                line={coachLine}
                messageKey={`${stepId}-${coachExpression}`}
                expression={coachExpression}
                tone={
                  coachExpression === "alert"
                    ? "danger"
                    : coachExpression === "celebrate"
                      ? "ok"
                      : "tip"
                }
                size="lg"
              />
            </div>
          )}
        </div>
      </main>
    </GridBackground>
  );
}
