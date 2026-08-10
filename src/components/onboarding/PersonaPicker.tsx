"use client";

import { FO } from "@/components/cyan";
import {
  PERSONA_AVATAR_PLACEHOLDER,
  PERSONAS,
  type PersonaSlug,
} from "@/lib/personas";

/**
 * Avatar radiogroup for onboarding.
 * Uses plain <img> (not next/image) so clicks always hit the button and
 * failed assets fall back without breaking selection state.
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
      aria-label="Choose a persona avatar"
      className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
      onMouseLeave={() => onHover?.(null)}
    >
      {PERSONAS.map((p) => {
        const active = value === p.slug;
        return (
          <button
            key={p.slug}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={p.name}
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
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 10px 10px",
              minHeight: 132,
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
              width={88}
              height={88}
              draggable={false}
              style={{
                width: 88,
                height: 88,
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
            <span
              style={{
                fontFamily: FO,
                fontSize: 11,
                fontWeight: active ? 700 : 600,
                color: active ? "var(--sv-teal-mid)" : "var(--sv-ink)",
                textAlign: "center",
                lineHeight: 1.2,
                pointerEvents: "none",
              }}
            >
              {p.name.replace(/^The\s+/i, "")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
