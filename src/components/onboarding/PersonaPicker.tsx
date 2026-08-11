"use client";

import {
  PERSONA_AVATAR_PLACEHOLDER,
  PERSONAS,
  type PersonaSlug,
} from "@/lib/personas";

/**
 * Face-only persona radiogroup for onboarding.
 * No role titles or display names — cosmetic avatar pick only.
 * Uses plain <img> so clicks always hit the button and failed assets fall back.
 */
export function PersonaPicker({
  value,
  onChange,
  onHover,
}: {
  value: PersonaSlug | "";
  onChange: (slug: PersonaSlug) => void;
  onHover?: (slug: PersonaSlug | null) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose a persona"
      className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3 mb-6"
      onMouseLeave={() => onHover?.(null)}
    >
      {PERSONAS.map((p, index) => {
        const active = value === p.slug;
        return (
          <button
            key={p.slug}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Persona ${index + 1}`}
            data-persona={p.slug}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(p.slug);
              onHover?.(p.slug);
            }}
            onMouseEnter={() => onHover?.(p.slug)}
            onFocus={() => onHover?.(p.slug)}
            className="touch-manipulation select-none"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
              minHeight: 96,
              borderRadius: 14,
              border: active
                ? "2.5px solid var(--sv-teal-mid)"
                : "1.5px solid var(--sv-border)",
              background: active ? "var(--sv-cyan-tint)" : "rgba(255,255,255,0.85)",
              cursor: "pointer",
              transition: active
                ? "none"
                : "border-color 0.12s ease, background 0.12s ease",
              boxShadow: active
                ? "0 0 0 3px color-mix(in srgb, var(--sv-teal-mid) 22%, transparent)"
                : "none",
              transform: active ? "scale(1.02)" : "scale(1)",
              WebkitTapHighlightColor: "transparent",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.avatarSrc}
              alt=""
              width={72}
              height={72}
              draggable={false}
              style={{
                width: 72,
                height: 72,
                objectFit: "contain",
                imageRendering: "pixelated",
                pointerEvents: "none",
                userSelect: "none",
              }}
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src.endsWith(PERSONA_AVATAR_PLACEHOLDER)) return;
                el.src = PERSONA_AVATAR_PLACEHOLDER;
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
