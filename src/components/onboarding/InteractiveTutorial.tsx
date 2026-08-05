"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { FO, GameButton, GlassCard } from "@/components/cyan";
import { Package, Truck, DollarSign, Target } from "@/components/cyan/PixelIcons";
import type { GameConfig } from "@/engine";
import { markTutorialDone } from "@/lib/tutorial";

type Step = "intro" | "order" | "delay" | "cost" | "ready";

export type InteractiveTutorialVariant = "onboarding" | "howtoplay";

/**
 * ~30s interactive tutorial: place a sample order → see delay → understand costs.
 * Cosmetic practice only — does not create an attempt.
 *
 * - `onboarding` — setup wizard card before first attempt
 * - `howtoplay` — same lesson from the in-game coach overlay
 */
export function InteractiveTutorial({
  config,
  onComplete,
  onSkip,
  variant = "onboarding",
  framed = true,
}: {
  config: GameConfig;
  onComplete: () => void;
  onSkip: () => void;
  variant?: InteractiveTutorialVariant;
  /** When false, parent supplies the chrome (e.g. How to Play coach bubble). */
  framed?: boolean;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [order, setOrder] = useState(4);
  const unit = config.timeline_unit || "Round";
  const unitLower = unit.toLowerCase();
  const delay = config.delivery_delay;
  const invCost = config.inventory_cost_per_unit;
  const blCost = config.backlog_cost_per_unit;
  const arrivalRound = 1 + delay;
  const isHowToPlay = variant === "howtoplay";

  const finish = (skipped: boolean) => {
    markTutorialDone();
    if (skipped) onSkip();
    else onComplete();
  };

  const delayLabel =
    delay === 1
      ? `1 ${unitLower}`
      : `${delay} ${unitLower}${unitLower.endsWith("s") ? "" : "s"}`;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          style={{
            fontFamily: FO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--sv-teal-mid)",
          }}
        >
          {isHowToPlay ? "How to play" : "Quick tutorial"}
        </span>
        <button
          type="button"
          onClick={() => finish(true)}
          style={{
            fontFamily: FO,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--sv-text-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {isHowToPlay ? "Close" : "Skip"}
        </button>
      </div>

      <StepDots step={step} />

      {step === "intro" && (
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Target size={28} color="var(--sv-teal-mid)" />
          </div>
          <h2 style={titleStyle}>Learn the loop in 30 seconds</h2>
          <p style={bodyStyle}>
            You order stock that arrives later. Holding inventory costs money — missing
            customer demand costs more. Balance both.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6 text-left">
            <MiniFact
              icon={<Package size={14} color="var(--sv-teal-mid)" />}
              label="Your job"
              value="Retailer"
            />
            <MiniFact
              icon={<Truck size={14} color="var(--sv-teal-mid)" />}
              label="Delay"
              value={delayLabel}
            />
            <MiniFact
              icon={<DollarSign size={14} color="var(--sv-teal-mid)" />}
              label="Win by"
              value="Low cost"
            />
          </div>
          <GameButton size="lg" style={{ width: "100%" }} onClick={() => setStep("order")}>
            Try a sample order
          </GameButton>
        </div>
      )}

      {step === "order" && (
        <div>
          <h2 style={titleStyle}>Place a practice order</h2>
          <p style={{ ...bodyStyle, textAlign: "left" }}>
            This is a dry run — nothing is saved. Pick how many units to order from your
            supplier.
          </p>
          <div
            className="flex items-center justify-center gap-2 my-5"
            style={{
              background: "rgba(255,255,255,0.88)",
              border: "1.4px solid var(--sv-border)",
              borderRadius: "var(--sv-radius-pill)",
              padding: "6px 8px",
              maxWidth: 280,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <StepBtn
              label="Decrease"
              onClick={() => setOrder((n) => Math.max(0, n - 1))}
              disabled={order <= 0}
            >
              −
            </StepBtn>
            <span
              className="sv-tabular"
              style={{
                fontFamily: FO,
                fontWeight: 800,
                fontSize: 28,
                color: "var(--sv-ink)",
                minWidth: 48,
                textAlign: "center",
              }}
            >
              {order}
            </span>
            <StepBtn
              label="Increase"
              onClick={() => setOrder((n) => Math.min(config.maximum_order, n + 1))}
              disabled={order >= config.maximum_order}
            >
              +
            </StepBtn>
          </div>
          <GameButton
            size="lg"
            style={{ width: "100%" }}
            onClick={() => setStep("delay")}
          >
            Confirm sample order
          </GameButton>
        </div>
      )}

      {step === "delay" && (
        <div>
          <h2 style={titleStyle}>Orders take time</h2>
          <p style={{ ...bodyStyle, textAlign: "left" }}>
            You ordered <strong>{order}</strong> units. They do not arrive now — they land
            after a delivery delay.
          </p>
          <div
            className="my-5 p-4 rounded-2xl"
            style={{
              border: "1.5px solid var(--sv-border)",
              background: "var(--sv-cyan-tint)",
            }}
          >
            <PipelineDemo delay={delay} order={order} unit={unit} arrivalRound={arrivalRound} />
          </div>
          <p
            style={{
              fontFamily: FO,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sv-text-secondary)",
              marginBottom: 20,
              lineHeight: 1.45,
            }}
          >
            Arrives in {delayLabel} ({unit} {arrivalRound}). Ordering more later cannot fix
            what is already in transit.
          </p>
          <GameButton size="lg" style={{ width: "100%" }} onClick={() => setStep("cost")}>
            Next: costs
          </GameButton>
        </div>
      )}

      {step === "cost" && (
        <div>
          <h2 style={titleStyle}>Two ways you lose money</h2>
          <div className="flex flex-col gap-3 mb-5 mt-2">
            <CostCard
              title="Inventory holding"
              amount={`$${invCost}`}
              detail="Per unit left on the shelf each round"
              tone="neutral"
            />
            <CostCard
              title="Backlog (stockout)"
              amount={`$${blCost}`}
              detail="Per unit of unfilled demand — usually higher"
              tone="danger"
            />
          </div>
          <p style={{ ...bodyStyle, textAlign: "left", marginBottom: 20 }}>
            Lowest total cost wins. Panic-ordering often creates a bullwhip — big swings in
            the pipeline.
          </p>
          <GameButton size="lg" style={{ width: "100%" }} onClick={() => setStep("ready")}>
            Got it
          </GameButton>
        </div>
      )}

      {step === "ready" && (
        <div className="text-center">
          <h2 style={titleStyle}>
            {isHowToPlay ? "You know the loop" : "You\u2019re ready"}
          </h2>
          <p style={bodyStyle}>
            {isHowToPlay
              ? "Check inventory, backlog, demand, and round history before each order. Lowest total cost wins."
              : "Check inventory, backlog, demand, and round history before each order. Charts fill as you play."}
          </p>
          <GameButton size="lg" style={{ width: "100%" }} onClick={() => finish(false)}>
            {isHowToPlay ? "Back to the game" : "Start the real game"}
          </GameButton>
        </div>
      )}
    </>
  );

  if (!framed) {
    return <div className="relative w-full overflow-hidden">{body}</div>;
  }

  return <GlassCard className="p-4 relative overflow-hidden w-full">{body}</GlassCard>;
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["intro", "order", "delay", "cost", "ready"];
  const idx = order.indexOf(step);
  return (
    <div className="flex gap-1.5 justify-center mb-4" aria-hidden>
      {order.map((s, i) => (
        <span
          key={s}
          style={{
            width: i === idx ? 18 : 6,
            height: 6,
            borderRadius: 99,
            background: i <= idx ? "var(--sv-teal-mid)" : "var(--sv-border)",
            transition: "width 0.2s ease, background 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

function MiniFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="p-2 rounded-xl"
      style={{
        border: "1px solid var(--sv-border)",
        background: "rgba(255,255,255,0.7)",
      }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span
          style={{
            fontFamily: FO,
            fontSize: 9,
            fontWeight: 700,
            color: "var(--sv-text-muted)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: FO,
          fontWeight: 700,
          fontSize: 13,
          color: "var(--sv-ink)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StepBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-sv-cyan-tint/70 disabled:opacity-35"
      style={{
        color: "var(--sv-teal-mid)",
        fontSize: 22,
        fontWeight: 600,
        border: "none",
        background: "transparent",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function PipelineDemo({
  delay,
  order,
  unit,
  arrivalRound,
}: {
  delay: number;
  order: number;
  unit: string;
  arrivalRound: number;
}) {
  const slots = Math.min(Math.max(delay, 1), 4);
  return (
    <div>
      <p
        style={{
          fontFamily: FO,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--sv-teal-mid)",
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Pipeline (sample)
      </p>
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span
          style={{
            fontFamily: FO,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--sv-text-secondary)",
          }}
        >
          Now
        </span>
        {Array.from({ length: slots }, (_, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{
              minWidth: 52,
              padding: "8px 6px",
              borderRadius: 10,
              border:
                i === slots - 1
                  ? "2px solid var(--sv-teal-mid)"
                  : "1.5px solid var(--sv-border)",
              background: i === slots - 1 ? "white" : "rgba(255,255,255,0.55)",
            }}
          >
            <span
              style={{
                fontFamily: FO,
                fontSize: 10,
                color: "var(--sv-text-muted)",
                fontWeight: 600,
              }}
            >
              +{i + 1}
            </span>
            <span
              className="sv-tabular"
              style={{
                fontFamily: FO,
                fontWeight: 800,
                fontSize: 16,
                color: i === slots - 1 ? "var(--sv-teal-mid)" : "var(--sv-text-muted)",
              }}
            >
              {i === slots - 1 ? order : "·"}
            </span>
          </div>
        ))}
        <span
          style={{
            fontFamily: FO,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--sv-teal-mid)",
          }}
        >
          {unit} {arrivalRound}
        </span>
      </div>
    </div>
  );
}

function CostCard({
  title,
  amount,
  detail,
  tone,
}: {
  title: string;
  amount: string;
  detail: string;
  tone: "neutral" | "danger";
}) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl text-left"
      style={{
        border: "1.5px solid var(--sv-border)",
        background: "rgba(255,255,255,0.75)",
      }}
    >
      <div
        className="sv-tabular shrink-0"
        style={{
          fontFamily: FO,
          fontWeight: 800,
          fontSize: 20,
          color: tone === "danger" ? "var(--sv-negative)" : "var(--sv-teal-mid)",
          minWidth: 40,
        }}
      >
        {amount}
      </div>
      <div className="min-w-0">
        <div style={{ fontFamily: FO, fontWeight: 700, fontSize: 14, color: "var(--sv-ink)" }}>
          {title}
        </div>
        <div
          style={{
            fontFamily: FO,
            fontSize: 12,
            color: "var(--sv-text-muted)",
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

const titleStyle: CSSProperties = {
  fontFamily: FO,
  fontWeight: 700,
  fontSize: 22,
  color: "var(--sv-ink)",
  marginBottom: 8,
  textAlign: "center",
  lineHeight: 1.2,
};

const bodyStyle: CSSProperties = {
  fontFamily: FO,
  fontSize: 14,
  color: "var(--sv-text-secondary)",
  marginBottom: 20,
  lineHeight: 1.5,
  textAlign: "center",
};
