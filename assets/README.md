# Retailer Challenge visual assets

Generated with the built-in image-generation workflow for the CYAN retailer
challenge. Production assets are text-free so labels, scores, access codes, and
QR codes remain accessible HTML rendered by the application.

`_sources/` retains the original generated PNGs, coach chroma-key inputs, and
light-background QA previews. It is reference material and should not be served
by the application; use the optimized files in the named production folders.

## Shared art direction

- Premium, crisp 16-bit-inspired pixel art with chunky square pixel clusters.
- Palette: off-white, pale blue-gray, ink navy, cyan, teal, cardboard brown,
  and restrained amber or muted red status accents. No pure black.
- No generated words, numbers, logos, trademarks, watermarks, charts, or UI.
- Coach poses preserve the existing coach's glasses, swept navy hair, navy suit,
  teal trim, bar-chart pin, proportions, and friendly personality.

## Coach cutouts

Transparent PNGs generated on a flat magenta chroma background and processed
with a hard pixel-art matte, despill, and one-pixel edge contraction.

| File | Prompt intent |
| --- | --- |
| `coach/coach-neutral-v2.png` | Full-body neutral, attentive stance with arms relaxed. |
| `coach/coach-explain-v2.png` | Teaching pose with one raised finger and one open hand. |
| `coach/coach-thinking-v2.png` | Reflective pose with hand under chin and folded arm. |
| `coach/coach-alert-v2.png` | Supportive warning pose with open palm and directional point. |
| `coach/coach-celebrate-v2.png` | Tasteful victory pose with both fists raised. |

## Warehouse key art

| File | Prompt intent |
| --- | --- |
| `warehouse/warehouse-hero-desktop.webp` | Wide modern retailer warehouse showing inbound delivery, storage, conveyor, and scanning flow. |
| `warehouse/warehouse-hero-mobile.webp` | Portrait recomposition of the same warehouse with a central aisle and mobile-safe margins. |

## Operational states

| File | Prompt intent |
| --- | --- |
| `operations/operations-healthy.webp` | Comfortably stocked shelves, even package flow, and one on-time truck. |
| `operations/operations-backlog.webp` | Empty shelf sections, waiting order totes, sparse conveyor, and a delayed truck. |
| `operations/operations-overstock.webp` | Full shelves, excess pallet stock, crowded conveyor, and continued inbound supply. |
| `operations/operations-bullwhip.webp` | Uneven inventory and deliveries with amplified cyan oscillation bands. |

## Report outcomes

| File | Prompt intent |
| --- | --- |
| `reports/report-strong.webp` | Controlled warehouse and celebrating coach for strong performance. |
| `reports/report-balanced.webp` | Mostly stable warehouse and encouraging coach for mixed performance. |
| `reports/report-learning.webp` | Uneven warehouse, calming oscillations, and thoughtful coach for a constructive learning outcome. |

## Host scene

| File | Prompt intent |
| --- | --- |
| `host/host-heat.webp` | Four equal-status player personas beside a blank presentation frame, with space for the real access-code UI. |

## Recommended selection logic

- Use the desktop or mobile warehouse hero based on the layout breakpoint.
- Select an operational state from current inventory, backlog, and order
  volatility; keep numeric truth in the UI.
- Select report art from the final cost, fill rate, and bullwhip metrics.
- Keep persona selection cosmetic; the host illustration gives every character
  equal visual status.
