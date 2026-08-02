# Design source

Visual language is **Cyan** from Classic Simulations `/demo/beer-game`.

| Source | Path |
|---|---|
| Tokens | `classic-simulations-frontend/migration/DESIGN_SYSTEM_TOKENS.css` → `src/styles/tokens.css` |
| UI primitives | `migration/CYAN_UI_BUNDLE.tsx` + cyan shell → `src/components/cyan` |
| Pixel icons | Streamline Pixel subset → `src/components/cyan/PixelIcons.tsx` + `icons/` |
| KPI cards | Classic `BoxView.tsx` → `src/components/game/BoxView.tsx` |
| Evolution charts | Classic `GraphicalView` (type: evolution) → `src/components/game/GraphicalView.tsx` |
| Logos | Classic `public/logos/*` → `public/logos/` |
| Screen reference | `/demo/beer-game` — DecisionDock, pipeline, BoxView KPIs, Inventory/Cost tabs |

## Rules

- `--sv-*` tokens only (no raw hex in components)
- Outfit via `next/font`
- PixelIcons only (no lucide / emoji)
- Glass cards: `var(--sv-card)`, white 1.4px border, 16px radius
