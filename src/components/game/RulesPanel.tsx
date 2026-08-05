"use client";

import Image from "next/image";
import { COACH_AVATAR_SRC } from "@/lib/personas";
import { InteractiveTutorial } from "@/components/onboarding/InteractiveTutorial";
import type { GameConfig } from "@/engine";

/**
 * How to Play — same coach overlay chrome players already like,
 * content is the onboarding InteractiveTutorial (sample order → delay → costs).
 */
export function RulesPanel({
  config,
  onClose,
}: {
  config: GameConfig;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-end bg-black/20 p-3 sm:p-6 md:p-8 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <aside
        className="flex flex-col-reverse sm:flex-row items-center sm:items-end w-full max-w-4xl justify-end mt-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative z-10 w-full max-w-lg mb-[28px] sm:mb-[44px] max-h-[min(78dvh,640px)] overflow-y-auto"
          style={{
            background: "rgba(255, 255, 255, 1)",
            border: "none",
            borderRadius: 16,
            padding: "20px 20px 18px",
            boxShadow: "var(--sv-shadow-2)",
          }}
        >
          {/* Tail → coach (desktop: right edge) */}
          <span
            aria-hidden
            className="hidden sm:block"
            style={{
              position: "absolute",
              right: -10,
              bottom: 36,
              width: 0,
              height: 0,
              borderTop: "10px solid transparent",
              borderBottom: "10px solid transparent",
              borderLeft: "10px solid rgba(255, 255, 255, 1)",
            }}
          />
          {/* Tail → coach (mobile: top, stack) */}
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

          <InteractiveTutorial
            config={config}
            variant="howtoplay"
            framed={false}
            onComplete={onClose}
            onSkip={onClose}
          />
        </div>

        <div className="pointer-events-none shrink-0 z-20 sm:-ml-4 mb-[-8px] sm:mb-0">
          <Image
            src={COACH_AVATAR_SRC}
            alt="Coach"
            width={120}
            height={160}
            unoptimized
            className="h-[100px] sm:h-[120px] lg:h-[132px] w-auto object-contain [image-rendering:pixelated] drop-shadow-xl"
          />
        </div>
      </aside>
    </div>
  );
}
