"use client";

import Image from "next/image";
import { FO, GameButton } from "@/components/cyan";
import { BookOpen } from "@/components/cyan/PixelIcons";
import { COACH_AVATAR_SRC } from "@/lib/personas";
import type { GameConfig } from "@/engine";

export function RulesPanel({ config, onClose }: { config: GameConfig; onClose: () => void }) {
  const unit = config.timeline_unit || "Round";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end justify-end bg-black/10 p-4 sm:p-6 md:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <aside 
        className="flex flex-col-reverse sm:flex-row items-center sm:items-end w-full max-w-4xl justify-end mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative z-10 w-full max-w-lg mb-[40px] sm:mb-[60px]"
          style={{
            background: "rgba(255, 255, 255, 1)",
            border: "none",
            borderRadius: 16,
            padding: "24px",
            boxShadow: "var(--sv-shadow-2)",
          }}
        >
          {/* Tail → coach (desktop: right) */}
          <span
            aria-hidden
            className="hidden sm:block"
            style={{
              position: "absolute",
              right: -10,
              bottom: 40,
              width: 0,
              height: 0,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderLeft: "10px solid rgba(255, 255, 255, 1)",
            }}
          />

          {/* Tail → coach (mobile: top) */}
          <span
            aria-hidden
            className="sm:hidden"
            style={{
              position: "absolute",
              top: -10,
              left: "50%",
              marginLeft: -10,
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid rgba(255, 255, 255, 1)",
            }}
          />

          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={20} color="var(--sv-teal-mid)" />
            <h2 style={{ fontFamily: FO, fontWeight: 700, fontSize: 18, color: "var(--sv-ink)" }}>
              How to play
            </h2>
          </div>
          
          <div
            style={{
              fontFamily: FO,
              fontSize: 14,
              color: "var(--sv-ink)",
              lineHeight: 1.55,
            }}
            className="space-y-4"
          >
            <p>
              You are the <strong style={{ color: "var(--sv-ink)" }}>retailer</strong>. Each {unit.toLowerCase()},
              customer demand arrives. Fulfil from stock (after inbound delivery). Order replenishment that
              arrives after a <strong style={{ color: "var(--sv-ink)" }}>{config.delivery_delay}-{unit.toLowerCase()} delay</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Holding inventory costs <strong>${config.inventory_cost_per_unit}</strong> per unit left at
                period end.
              </li>
              <li>
                Unmet demand becomes backlog at <strong>${config.backlog_cost_per_unit}</strong> per unit
                (usually more expensive).
              </li>
              <li>Check the pipeline before placing large orders — stock already in transit will arrive.</li>
              <li>Goal: finish with the <strong>lowest cumulative cost</strong>.</li>
              <li>
                Orders that would arrive after {unit.toLowerCase()} {config.total_rounds} never arrive —
                same rules every period.
              </li>
            </ul>
          </div>
          
          <div className="mt-8 flex justify-end">
            <GameButton onClick={onClose} size="sm">
              Got it
            </GameButton>
          </div>
        </div>

        <div className="pointer-events-none shrink-0 z-20 sm:-ml-4 mb-[-10px] sm:mb-0">
          <Image 
            src={COACH_AVATAR_SRC} 
            alt="Coach" 
            width={160}
            height={240}
            className="h-[140px] sm:h-[180px] lg:h-[220px] w-auto object-contain [image-rendering:pixelated] drop-shadow-xl" 
          />
        </div>
      </aside>
    </div>
  );
}
