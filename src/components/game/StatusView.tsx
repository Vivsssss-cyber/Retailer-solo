"use client";

import React from "react";
import Image from "next/image";
import { Users, Truck, ShoppingCart, Package } from "@/components/cyan/PixelIcons";

const FO = "var(--sv-font-ui)";
/** Strong ease-out — enter/settle (Emil). */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** Strong ease-in-out — on-screen travel (Emil). */
const EASE_TRAVEL = "cubic-bezier(0.65, 0, 0.35, 1)";
/** Marker travel length — explanatory but not sluggish. */
const MARKER_DURATION = "3.2s";
const MARKER_DELAYS = {
  received: "0.08s",
  requested: "0.28s",
  sent: "0.48s",
} as const;

const customStyles = `
@keyframes float-subtle {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -2px, 0); }
}
.sv-float-marker {
  animation: float-subtle 4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  will-change: transform;
}
.sv-float-marker-inner {
  transition: transform 160ms ${EASE_OUT};
  transform: scale(1);
}
.sv-marker-track {
  will-change: transform, opacity;
  backface-visibility: hidden;
}
.sv-stage-node {
  transition: transform 200ms ${EASE_OUT}, box-shadow 200ms ${EASE_OUT}, border-color 200ms ${EASE_OUT};
  transform: scale(1);
  width: var(--sv-node-size, 72px);
  height: var(--sv-node-size, 72px);
}
.sv-stage-node.sv-active {
  transform: scale(1.04);
}
.sv-stage-icon-well {
  width: var(--sv-icon-well, 50px);
  height: var(--sv-icon-well, 50px);
}
.sv-stage-icon-well img,
.sv-stage-icon-well svg {
  max-width: 72%;
  max-height: 72%;
}
.sv-status-rail {
  top: calc(var(--sv-node-size, 72px) / 2);
}
.sv-active-rail {
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform-box: fill-box;
}
.sv-player-avatar-frame {
  width: var(--sv-avatar-size, 64px);
  height: var(--sv-avatar-size, 64px);
}
/* Phones: denser rail so round summary fits without endless scroll */
@media (max-width: 640px) {
  .sv-status-view--sim {
    --sv-node-size: 48px;
    --sv-icon-well: 32px;
    --sv-rail-top: 52px;
    --sv-avatar-size: 40px;
    --sv-marker-lift-y: -48px;
    padding: 10px 8px 8px !important;
  }
  .sv-status-view:not(.sv-status-view--sim) {
    --sv-node-size: 48px;
    --sv-icon-well: 32px;
  }
  .sv-status-stage-label {
    font-size: 10px !important;
  }
  .sv-status-sim-area {
    padding-top: 56px !important;
    min-height: 172px !important;
  }
  .sv-float-marker-inner {
    width: 108px !important;
    height: 72px !important;
  }
  .sv-status-view--sim .sv-status-sim-area {
    padding-bottom: 2px !important;
  }
}

/* Very short viewports (landscape phones / small height) */
@media (max-width: 640px) and (max-height: 700px) {
  .sv-status-view--sim {
    --sv-node-size: 44px;
    --sv-icon-well: 28px;
    --sv-avatar-size: 36px;
    --sv-marker-lift-y: -40px;
  }
  .sv-status-sim-area {
    padding-top: 44px !important;
    min-height: 148px !important;
  }
}
@media (hover: hover) and (pointer: fine) {
  .sv-float-marker:hover .sv-float-marker-inner {
    transform: scale(1.04);
  }
  .sv-stage-node:hover {
    transform: scale(1.05);
  }
  .sv-stage-node.sv-active:hover {
    transform: scale(1.06);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sv-float-marker {
    animation: none;
  }
  .sv-marker-track {
    animation: none !important;
  }
  .sv-active-rail {
    animation: none !important;
    opacity: 1 !important;
    transform: translateY(-50%) scaleX(1) !important;
  }
  .sv-marker-lift {
    animation: none !important;
    transform: translateY(var(--sv-marker-lift-y, -84px)) scale(1) !important;
    opacity: 1 !important;
  }
}
`;

export interface SupplyChainData {
  title: string;
  stages: string[];
  currentStage?: string;
  incomingAmount?: number;
  outgoingAmount?: number;
  orderAmount?: number;
  originalOrderAmount?: number;
  incomingDemand?: number;
}

interface StatusViewProps {
  data: SupplyChainData;
  children?: React.ReactNode;
  showSimulation?: boolean;
  /** Player persona art — stays under the retailer stage (never fades). */
  playerAvatarSrc?: string | null;
  playerName?: string;
}

/**
 * Supply-chain strip with optional one-shot FlowMarker travel animation.
 * Player avatar sits under Retailer and remains visible after markers park.
 */
export default function StatusView({
  data,
  children,
  showSimulation = false,
  playerAvatarSrc,
  playerName,
}: StatusViewProps) {
  const getStageIndex = React.useCallback(
    (stageName: string) => {
      if (!data || !stageName) return -1;
      return data.stages.findIndex(
        (s) => s.toLowerCase() === stageName.toLowerCase(),
      );
    },
    [data],
  );

  const getIcon = (stage: string, size: number) => {
    const filter = "brightness(0) saturate(100%) invert(100%)";
    switch (stage.toLowerCase()) {
      case "factory":
        return (
          <Image
            src="/logos/factory.svg"
            alt={stage}
            width={size}
            height={size}
            style={{ filter }}
            unoptimized
          />
        );
      case "distributor":
        return (
          <Image
            src="/logos/distributor.svg"
            alt={stage}
            width={size}
            height={size}
            style={{ filter }}
            unoptimized
          />
        );
      case "wholesaler":
        return (
          <Image
            src="/logos/wholeseller.svg"
            alt={stage}
            width={size}
            height={size}
            style={{ filter }}
            unoptimized
          />
        );
      case "retailer":
        return (
          <Image
            src="/logos/retailer.svg"
            alt={stage}
            width={size}
            height={size}
            style={{ filter }}
            unoptimized
          />
        );
      case "customer":
      case "customers":
        return <Users size={size} color="#ffffff" />;
      default:
        return <Users size={size} color="#ffffff" />;
    }
  };

  if (!data) return null;

  const segmentWidth = 100 / data.stages.length;
  let currentIdx = getStageIndex(data.currentStage || "");
  if (currentIdx === -1 && data.currentStage === "Unknown") currentIdx = 1;

  const getCenterPct = (idx: number) => idx * segmentWidth + segmentWidth / 2;
  const currentCenter = getCenterPct(currentIdx);
  const prevCenter = getCenterPct(Math.max(0, currentIdx - 1));
  const nextCenter = getCenterPct(Math.min(data.stages.length - 1, currentIdx + 1));

  const showPlayerAvatar = Boolean(playerAvatarSrc) && showSimulation;
  // Prefer CSS vars so mobile can scale without JS matchMedia.
  const nodeSize = showSimulation ? 88 : 72;
  const iconWell = showSimulation ? 58 : 50;
  const railTop = showSimulation ? 92 : 56;

  return (
    <div
      className={`sv-glass-card sv-status-view relative h-full flex flex-col ${
        showSimulation ? "sv-status-view--sim" : ""
      }`}
      style={
        {
          padding: showSimulation ? "14px 12px 12px" : 12,
          ["--sv-node-size" as string]: `${nodeSize}px`,
          ["--sv-icon-well" as string]: `${iconWell}px`,
          ["--sv-rail-top" as string]: `${railTop}px`,
          ["--sv-avatar-size" as string]: "64px",
          ["--sv-marker-lift-y" as string]: "-84px",
        } as React.CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {data.title && (
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <p
              style={{
                fontFamily: FO,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--sv-teal-mid)",
                marginBottom: 2,
              }}
            >
              Delivery pipeline
            </p>
            <h3
              style={{
                fontFamily: FO,
                fontWeight: 700,
                fontSize: 15,
                color: "var(--sv-ink)",
                letterSpacing: "-0.2px",
              }}
            >
              {data.title}
            </h3>
          </div>
          {showSimulation && (
            <span
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--sv-text-secondary)",
                background: "var(--sv-muted)",
                border: "1px solid var(--sv-border-soft, var(--sv-border))",
                borderRadius: "var(--sv-radius-pill)",
                padding: "4px 10px",
                whiteSpace: "nowrap",
              }}
            >
              Your role · Retailer
            </span>
          )}
        </div>
      )}

      <div
        className={`relative w-full ${showSimulation ? "sv-status-sim-area" : ""}`}
        style={{
          paddingTop: showSimulation ? 96 : 12,
          paddingBottom: showPlayerAvatar ? 8 : 4,
          // Desktop defaults; mobile media queries tighten with !important
          minHeight: showSimulation ? (showPlayerAvatar ? 280 : 220) : 140,
        }}
      >


        {/* Rail + stage nodes */}
        <div className="relative w-full" style={{ marginTop: showSimulation ? 8 : 0 }}>
          {/* Travel markers (above rail) */}
          {showSimulation && (
            <div
              className="absolute inset-0 z-30 pointer-events-none"
            >
              {data.incomingAmount !== undefined && currentIdx > 0 && (
                <FlowMarker
                  id="received"
                  startX={prevCenter}
                  endX={currentCenter}
                  label="Order Received"
                  value={`${data.incomingAmount}/${data.originalOrderAmount || 0}`}
                  icon={<Package size={24} color="var(--sv-teal-dark)" />}
                  duration={MARKER_DURATION}
                  delay={MARKER_DELAYS.received}
                />
              )}
              {data.orderAmount !== undefined && currentIdx > 0 && (
                <FlowMarker
                  id="requested"
                  startX={currentCenter}
                  endX={prevCenter}
                  label="Requested Order"
                  value={`${data.orderAmount}`}
                  icon={<ShoppingCart size={24} color="var(--sv-teal-dark)" />}
                  duration={MARKER_DURATION}
                  delay={MARKER_DELAYS.requested}
                />
              )}
              {data.outgoingAmount !== undefined &&
                currentIdx < data.stages.length - 1 && (
                  <FlowMarker
                    id="sent"
                    startX={currentCenter}
                    endX={nextCenter}
                    label="Order Sent"
                    value={`${data.outgoingAmount}/${data.incomingDemand || 0}`}
                    icon={<Truck size={24} color="var(--sv-teal-dark)" />}
                    duration={MARKER_DURATION}
                    delay={MARKER_DELAYS.sent}
                  />
                )}
            </div>
          )}
          {/* Base rail */}
          <div
            aria-hidden
            className="absolute sv-status-rail"
            style={{
              left: `${segmentWidth / 2}%`,
              right: `${segmentWidth / 2}%`,
              height: 3,
              background: "var(--sv-border)",
              borderRadius: 9999,
              transform: "translateY(-50%)",
            }}
          />
          {/* Active rails + direction arrows on the lines */}
          {currentIdx > 0 && (
            <>
              {!showSimulation && (
                <div
                  aria-hidden
                  className="absolute sv-status-rail"
                  style={{
                    left: `${prevCenter}%`,
                    width: `${currentCenter - prevCenter}%`,
                    height: 3,
                    background: "linear-gradient(90deg, var(--sv-teal-light), var(--sv-teal-mid))",
                    borderRadius: 9999,
                    transform: "translateY(-50%)",
                  }}
                />
              )}
              {showSimulation && data.incomingAmount !== undefined && (
                <ActiveRail
                  id="rail-incoming"
                  startX={prevCenter}
                  endX={currentCenter}
                  direction="right"
                  duration={MARKER_DURATION}
                  delay={MARKER_DELAYS.received}
                  colorStart="var(--sv-teal-light)"
                  colorEnd="var(--sv-positive)"
                />
              )}
              {showSimulation && data.orderAmount !== undefined && (
                <ActiveRail
                  id="rail-order"
                  startX={currentCenter}
                  endX={prevCenter}
                  direction="left"
                  duration={MARKER_DURATION}
                  delay={MARKER_DELAYS.requested}
                  colorStart="var(--sv-teal-light)"
                  colorEnd="var(--sv-teal-mid)"
                />
              )}
            </>
          )}
          {currentIdx < data.stages.length - 1 && currentIdx >= 0 && (
            <>
              {!showSimulation && (
                <div
                  aria-hidden
                  className="absolute sv-status-rail"
                  style={{
                    left: `${currentCenter}%`,
                    width: `${nextCenter - currentCenter}%`,
                    height: 3,
                    background: "linear-gradient(90deg, var(--sv-teal-mid), var(--sv-teal-light))",
                    borderRadius: 9999,
                    transform: "translateY(-50%)",
                  }}
                />
              )}
              {showSimulation && data.outgoingAmount !== undefined && (
                <ActiveRail
                  id="rail-outgoing"
                  startX={currentCenter}
                  endX={nextCenter}
                  direction="right"
                  duration={MARKER_DURATION}
                  delay={MARKER_DELAYS.sent}
                  colorStart="var(--sv-teal-mid)"
                  colorEnd="var(--sv-teal-light)"
                />
              )}
            </>
          )}

          <div className="relative flex justify-between items-start z-10">
            {data.stages.map((stage, idx) => {
              const isActive =
                stage.toLowerCase() === data.currentStage?.toLowerCase() ||
                (data.currentStage === "Unknown" && idx === 1);
              const isRetailer = stage.toLowerCase() === "retailer";

              return (
                <div
                  key={stage}
                  className="flex flex-col items-center"
                  style={{ width: `${segmentWidth}%`, gap: 8 }}
                >
                  <div
                    className={`sv-stage-node ${isActive ? "sv-active" : ""}`}
                    style={{
                      borderRadius: showSimulation ? 18 : 16,
                      background: "var(--sv-gradient-strategic)",
                      border: isActive
                        ? "1.5px solid var(--sv-cyan)"
                        : "1.5px solid color-mix(in srgb, white 22%, transparent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isActive
                        ? "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 3px color-mix(in srgb, var(--sv-cyan) 22%, transparent), 0 8px 20px rgba(0, 44, 51, 0.14)"
                        : "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 12px rgba(0, 44, 51, 0.1)",
                    }}
                  >
                    <div
                      className="sv-stage-icon-well"
                      style={{
                        borderRadius: 9999,
                        background: isActive
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(255,255,255,0.16)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {getIcon(stage, showSimulation ? 30 : 26)}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="sv-status-stage-label text-center px-0.5"
                      style={{
                        fontFamily: FO,
                        fontWeight: 700,
                        fontSize: showSimulation ? 13 : 12,
                        color: isActive ? "var(--sv-ink)" : "var(--sv-text-secondary)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {stage}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontFamily: FO,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--sv-teal-mid)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        You are here
                      </span>
                    )}
                  </div>

                  {/* Player persona — under retailer only, always solid */}
                  {isRetailer && showPlayerAvatar && (
                    <div
                      className="flex flex-col items-center"
                      style={{ marginTop: 2, gap: 6 }}
                    >
                      {/* Soft connector from stage to avatar */}
                      <div
                        aria-hidden
                        style={{
                          width: 2,
                          height: 14,
                          borderRadius: 2,
                          background:
                            "linear-gradient(180deg, var(--sv-teal-mid), color-mix(in srgb, var(--sv-cyan) 40%, transparent))",
                          opacity: 0.55,
                        }}
                      />
                      <div
                        className="sv-player-avatar-frame"
                        style={{
                          position: "relative",
                          borderRadius: 16,
                          background:
                            "linear-gradient(160deg, var(--sv-cyan-tint), var(--sv-card-solid))",
                          border: "1.5px solid white",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 16px rgba(0, 44, 51, 0.08)",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={playerAvatarSrc!}
                          alt={playerName ?? "You"}
                          width={58}
                          height={58}
                          style={{
                            width: "90%",
                            height: "90%",
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      </div>
                      {playerName && (
                        <span
                          style={{
                            fontFamily: FO,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--sv-ink)",
                            maxWidth: 110,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {playerName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ActiveRail({
  startX,
  endX,
  direction,
  duration,
  delay,
  colorStart,
  colorEnd,
  id,
}: {
  startX: number;
  endX: number;
  direction: "left" | "right";
  duration: string;
  delay: string;
  colorStart: string;
  colorEnd: string;
  id: string;
}) {
  const widthPct = Math.abs(endX - startX);
  const isRight = direction === "right";
  const animName = `fill-rail-${id}`;

  // scaleX (not width) — GPU-only, no layout thrash while markers travel
  const customAnim = `
    @keyframes ${animName} {
      0% {
        transform: translateY(-50%) scaleX(0.001);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      100% {
        transform: translateY(-50%) scaleX(1);
        opacity: 1;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customAnim }} />
      <div
        aria-hidden
        className="absolute sv-status-rail sv-active-rail z-[5]"
        style={{
          left: isRight ? `${startX}%` : undefined,
          right: !isRight ? `${100 - startX}%` : undefined,
          width: `${widthPct}%`,
          height: 3,
          background: `linear-gradient(${isRight ? 90 : -90}deg, ${colorStart}, ${colorEnd})`,
          borderRadius: 9999,
          transformOrigin: isRight ? "left center" : "right center",
          transform: "translateY(-50%) scaleX(1)",
          animation: `${animName} ${duration} ${EASE_TRAVEL} ${delay} both`,
          display: "flex",
          alignItems: "center",
          justifyContent: isRight ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            position: "absolute",
            [isRight ? "right" : "left"]: -4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 10 10"
            fill="none"
            style={{
              display: "block",
              transform: isRight ? "none" : "scaleX(-1)",
            }}
          >
            <path
              d="M3 1.5L7.5 5L3 8.5"
              stroke={colorEnd}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </>
  );
}

function FlowMarker({
  id,
  startX,
  endX,
  label,
  value,
  icon,
  duration = MARKER_DURATION,
  delay = "0s",
}: {
  id: string;
  startX: number;
  endX: number;
  label: string;
  value: string;
  icon: React.ReactNode;
  duration?: string;
  delay?: string;
}) {
  const animNameX = `move-marker-x-${id}`;
  const animNameLift = `move-marker-lift-${id}`;

  // Travel = ease-in-out (on-screen motion). Lift/settle = ease-out (responsive).
  // Soft opacity + scale entry — never pop from nothing.
  const customAnim = `
    @keyframes ${animNameX} {
      0% {
        transform: translate3d(${startX}%, 0, 0);
        opacity: 0;
      }
      12% {
        opacity: 1;
      }
      100% {
        transform: translate3d(${endX}%, 0, 0);
        opacity: 1;
      }
    }
    @keyframes ${animNameLift} {
      0% {
        transform: translateY(-12px) scale(0.94);
        opacity: 0;
      }
      14% {
        transform: translateY(-16px) scale(1);
        opacity: 1;
      }
      68% {
        transform: translateY(-16px) scale(1);
        opacity: 1;
      }
      100% {
        transform: translateY(var(--sv-marker-lift-y, -84px)) scale(1);
        opacity: 1;
      }
    }
  `;

  return (
    <div
      className="absolute inset-x-0 top-0 pointer-events-none z-[10]"
      style={{ height: "100%" }}
    >
      <style dangerouslySetInnerHTML={{ __html: customAnim }} />
      <div
        className="sv-marker-track absolute left-0 top-0 w-full"
        style={{
          top: 0,
          transform: `translate3d(${endX}%, 0, 0)`,
          opacity: 1,
          animation: `${animNameX} ${duration} ${EASE_TRAVEL} ${delay} both`,
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            className="sv-marker-lift"
            style={{
              animation: `${animNameLift} ${duration} ${EASE_OUT} ${delay} both`,
            }}
          >
            <div className="sv-float-marker">
              <div
                className="sv-float-marker-inner relative"
                style={{ width: 140, height: 88 }}
              >
                {/* Value Pill (Top) */}
                <div
                  className="absolute w-full flex justify-center"
                  style={{ top: 2 }}
                >
                  <div
                    className="sv-tabular"
                    style={{
                      background: "white",
                      boxShadow: "0 2px 8px rgba(0,44,51,0.08)",
                      border:
                        "1px solid color-mix(in srgb, var(--sv-border) 40%, white)",
                      borderRadius: "var(--sv-radius-pill)",
                      padding: "3px 8px",
                      fontFamily: FO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--sv-ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {value}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--sv-text-secondary)",
                        marginLeft: 4,
                      }}
                    >
                      units
                    </span>
                  </div>
                </div>

                {/* Icon (Center on rail) */}
                <div
                  className="absolute w-full flex justify-center"
                  style={{ top: 44, transform: "translateY(-50%)" }}
                >
                  <div
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))",
                    }}
                  >
                    {icon}
                  </div>
                </div>

                {/* Label (Bottom) */}
                <div
                  className="absolute w-full flex justify-center"
                  style={{ top: 62 }}
                >
                  <span
                    style={{
                      fontFamily: FO,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--sv-ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

