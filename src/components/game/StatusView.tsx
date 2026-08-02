"use client";

import React from "react";
import Image from "next/image";
import { Users, Truck, ShoppingCart, Package } from "@/components/cyan/PixelIcons";

const FO = "var(--sv-font-ui)";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

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
}
.sv-stage-node.sv-active {
  transform: scale(1.04);
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
  const nodeSize = showSimulation ? 88 : 72;
  const iconWell = showSimulation ? 58 : 50;
  const railTop = showSimulation ? 92 : 56;

  return (
    <div
      className="sv-glass-card relative h-full flex flex-col"
      style={{ padding: showSimulation ? "18px 20px 16px" : 16 }}
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
        className="relative w-full"
        style={{
          paddingTop: showSimulation ? 96 : 12,
          paddingBottom: showPlayerAvatar ? 8 : 4,
          minHeight: showSimulation ? (showPlayerAvatar ? 320 : 250) : 140,
        }}
      >
        {/* Travel markers (above rail) */}
        {showSimulation && (
          <div className="absolute inset-x-0 top-0 z-30" style={{ height: railTop + 8 }}>
            {data.incomingAmount !== undefined && currentIdx > 0 && (
              <FlowMarker
                id="received"
                startX={prevCenter}
                endX={currentCenter}
                label="Received"
                value={`${data.incomingAmount}/${data.originalOrderAmount || 0}`}
                icon={<Truck size={22} color="var(--sv-teal-mid)" />}
                accent="var(--sv-positive)"
                duration="2.6s"
                delay="0.12s"
              />
            )}
            {data.orderAmount !== undefined && currentIdx > 0 && (
              <FlowMarker
                id="requested"
                startX={currentCenter}
                endX={prevCenter}
                label="Ordered"
                value={`${data.orderAmount}`}
                icon={<ShoppingCart size={22} color="var(--sv-teal-mid)" />}
                accent="var(--sv-teal-mid)"
                duration="2.6s"
                delay="0.38s"
              />
            )}
            {data.outgoingAmount !== undefined &&
              currentIdx < data.stages.length - 1 && (
                <FlowMarker
                  id="sent"
                  startX={currentCenter}
                  endX={nextCenter}
                  label="Shipped"
                  value={`${data.outgoingAmount}/${data.incomingDemand || 0}`}
                  icon={<Package size={22} color="var(--sv-teal-mid)" />}
                  accent="var(--sv-teal-mid)"
                  duration="2.6s"
                  delay="0.64s"
                />
              )}
          </div>
        )}

        {/* Rail + stage nodes */}
        <div className="relative w-full" style={{ marginTop: showSimulation ? 8 : 0 }}>
          {/* Base rail */}
          <div
            aria-hidden
            className="absolute"
            style={{
              top: nodeSize / 2,
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
              <div
                aria-hidden
                className="absolute"
                style={{
                  top: nodeSize / 2,
                  left: `${prevCenter}%`,
                  width: `${currentCenter - prevCenter}%`,
                  height: 3,
                  background:
                    "linear-gradient(90deg, var(--sv-teal-light), var(--sv-teal-mid))",
                  borderRadius: 9999,
                  transform: "translateY(-50%)",
                }}
              />
              {/* Incoming delivery → right; orders → left */}
              {showSimulation && data.incomingAmount !== undefined && (
                <RailLineArrow
                  xPct={(prevCenter + currentCenter) / 2 + 4}
                  top={nodeSize / 2}
                  direction="right"
                  color="var(--sv-positive)"
                />
              )}
              {showSimulation && data.orderAmount !== undefined && (
                <RailLineArrow
                  xPct={(prevCenter + currentCenter) / 2 - 4}
                  top={nodeSize / 2}
                  direction="left"
                  color="var(--sv-teal-mid)"
                />
              )}
            </>
          )}
          {currentIdx < data.stages.length - 1 && currentIdx >= 0 && (
            <>
              <div
                aria-hidden
                className="absolute"
                style={{
                  top: nodeSize / 2,
                  left: `${currentCenter}%`,
                  width: `${nextCenter - currentCenter}%`,
                  height: 3,
                  background:
                    "linear-gradient(90deg, var(--sv-teal-mid), var(--sv-teal-light))",
                  borderRadius: 9999,
                  transform: "translateY(-50%)",
                }}
              />
              {/* Shipped → right toward customer */}
              {showSimulation && data.outgoingAmount !== undefined && (
                <RailLineArrow
                  xPct={(currentCenter + nextCenter) / 2}
                  top={nodeSize / 2}
                  direction="right"
                  color="var(--sv-teal-mid)"
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
                  style={{ width: `${segmentWidth}%`, gap: 10 }}
                >
                  <div
                    className={`sv-stage-node ${isActive ? "sv-active" : ""}`}
                    style={{
                      width: nodeSize,
                      height: nodeSize,
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
                      style={{
                        width: iconWell,
                        height: iconWell,
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
                        style={{
                          position: "relative",
                          width: 64,
                          height: 64,
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
                            width: 58,
                            height: 58,
                            objectFit: "contain",
                            imageRendering: "pixelated",
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          style={{
                            fontFamily: FO,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            color: "var(--sv-teal-mid)",
                          }}
                        >
                          Operator
                        </span>
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

/** Filled chevron centered on a rail segment — no glow. */
function RailLineArrow({
  xPct,
  top,
  direction,
  color,
}: {
  xPct: number;
  top: number;
  direction: "left" | "right";
  color: string;
}) {
  return (
    <div
      aria-hidden
      className="absolute z-[5] pointer-events-none"
      style={{
        left: `${xPct}%`,
        top,
        transform: "translate(-50%, -50%)",
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
          transform: direction === "left" ? "scaleX(-1)" : undefined,
        }}
      >
        <path
          d="M3 1.5L7.5 5L3 8.5"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function FlowMarker({
  id,
  startX,
  endX,
  label,
  value,
  icon,
  accent,
  duration = "2.6s",
  delay = "0s",
}: {
  id: string;
  startX: number;
  endX: number;
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  duration?: string;
  delay?: string;
}) {
  const animName = `move-marker-${id}`;
  // One-shot: ease into destination, stay (forwards). No disappear.
  const customAnim = `
    @keyframes ${animName} {
      0% {
        transform: translate3d(${startX}%, 0, 0);
        opacity: 0.7;
      }
      12% {
        opacity: 1;
      }
      100% {
        transform: translate3d(${endX}%, 0, 0);
        opacity: 1;
      }
    }
  `;

  return (
    <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: "100%" }}>
      <style dangerouslySetInnerHTML={{ __html: customAnim }} />
      <div
        className="sv-marker-track absolute left-0 top-0 w-full"
        style={{
          transform: `translate3d(${endX}%, 0, 0)`,
          opacity: 1,
          animation: `${animName} ${duration} ${EASE_OUT} ${delay} both`,
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ transform: "translateX(-50%)" }}
        >
          <div className="sv-float-marker">
            <div className="sv-float-marker-inner flex flex-col items-center gap-1">
              <div
                className="sv-tabular"
                style={{
                  background: "var(--sv-card-solid)",
                  border: "1px solid color-mix(in srgb, var(--sv-border) 80%, white)",
                  borderRadius: "var(--sv-radius-pill)",
                  padding: "3px 9px",
                  fontFamily: FO,
                  fontSize: 11,
                  fontWeight: 800,
                  color: accent,
                  whiteSpace: "nowrap",
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 10,
                    color: "var(--sv-text-secondary)",
                    marginLeft: 3,
                  }}
                >
                  u
                </span>
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--sv-cyan-tint)",
                  border: "1.4px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </div>
              <span
                style={{
                  fontFamily: FO,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--sv-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
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
  );
}
