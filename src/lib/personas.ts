// Player personas — cosmetic identity only (from Segment characters).
// Art lives at public/characters/avatars/<slug>.png

export type PersonaSlug =
  | "the-analyst"
  | "the-closer"
  | "the-architect"
  | "the-scout"
  | "the-steward";

export interface Persona {
  slug: PersonaSlug;
  name: string;
  /** Coach line shown on hover/select in the picker. */
  coachLine: string;
  avatarSrc: string;
}

export const PERSONA_AVATAR_PLACEHOLDER = "/characters/avatars/avatar-placeholder.svg";

export const COACH_AVATAR_SRC = "/characters/game-marketing-expert.png";

export const PERSONAS: Persona[] = [
  {
    slug: "the-analyst",
    name: "The Analyst",
    coachLine: "You'll watch the numbers before you order. Good.",
    avatarSrc: "/characters/avatars/the-analyst.png",
  },
  {
    slug: "the-closer",
    name: "The Closer",
    coachLine: "Fast decisions. Just don't panic-order the warehouse.",
    avatarSrc: "/characters/avatars/the-closer.png",
  },
  {
    slug: "the-architect",
    name: "The Architect",
    coachLine: "You build systems. Keep the pipeline stable.",
    avatarSrc: "/characters/avatars/the-architect.png",
  },
  {
    slug: "the-scout",
    name: "The Scout",
    coachLine: "You'll spot demand shifts before they hit.",
    avatarSrc: "/characters/avatars/the-scout.png",
  },
  {
    slug: "the-steward",
    name: "The Steward",
    coachLine: "You protect inventory and customers. That's the job.",
    avatarSrc: "/characters/avatars/the-steward.png",
  },
];

const PERSONA_BY_SLUG = Object.fromEntries(PERSONAS.map((p) => [p.slug, p])) as Record<
  PersonaSlug,
  Persona
>;

export function personaBySlug(slug: string | undefined | null): Persona | undefined {
  if (!slug) return undefined;
  return PERSONA_BY_SLUG[slug as PersonaSlug];
}

export function isPersonaSlug(value: string | undefined | null): value is PersonaSlug {
  return !!value && value in PERSONA_BY_SLUG;
}
