# AGENTS.md — Retailer Challenge

> Canonical guide for AI agents and humans.  
> `CLAUDE.md` only contains `@AGENTS.md` so tools that load either file stay in sync.

**Product:** Beer Game Sprint — The Retailer Challenge (single-player supply chain)  
**PRD:** `../Retailer Challenge.pdf`  
**Sibling (design source only):** `../classic-simulations-frontend` — do **not** wire multiplayer Redux/WS here.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js App Router + TypeScript |
| Styling | Tailwind 4 + `--sv-*` tokens (`src/styles/tokens.css`) |
| UI shell | `src/components/cyan` (GridBackground, GameButton, TabBar, PixelIcons) |
| State | Zustand `src/store/useAttemptStore.ts` |
| Engine | Pure TS `src/engine/*` (unit-tested; shared contract with backend) |
| API | `src/services/api.ts` live · `mockAdapter.ts` default offline |
| Charts | Recharts via `GraphicalView` (beer-game evolution style) |
| Motion | `motion/react` |
| Tests | Vitest (`npm test`) |

---

## Project map

```
src/
  app/                 # routes: / , /play/[attemptId], /api/retailer-challenge/*
  components/
    cyan/              # design system + PixelIcons
    game/              # play UI (KPIs, pipeline, charts, decision)
    report/            # final performance report
  engine/              # PRD formulas (source of truth for math)
  server/              # backend domain: store, service, leaderboard, errors
  services/            # client API + mock
  store/               # Zustand
  styles/tokens.css    # --sv-* Cyan tokens
docs/
  BACKEND_GUIDE.md     # backend expectations
  BACKEND_STATUS.md    # what is implemented vs next
  API_CONTRACT.md      # endpoint sheet
  DESIGN_SOURCE.md     # design provenance
  DEPLOY.md            # Railway / Render / tunnel Live Mode
public/
  cyan-logo.svg, characters/*, images/intro/*, logos/*  # only referenced assets
```

---

## Routes

| Path | Purpose |
|---|---|
| `/` | Intro, name, solo start / join heat code |
| `/play/[attemptId]` | Active game + report |
| `/admin` | Admin: game numbers, demand/supply, sessions (PIN from `ADMIN_PIN` env; mock default `admin`) |
| `/admin/game` | Edit rounds, costs, starting state, coaching panels |
| `/admin/sequences` | Per-round demand & supply rate editors |
| `/admin/data` | Local heats/attempts + clear mock data |

---

## Design non-negotiables

- **Tokens only:** `var(--sv-*)` — no raw hex in new UI chrome  
- **Icons:** PixelIcons only — no lucide-react, no emoji  
- **Font:** Outfit (`next/font`) via `--sv-font-ui`  
- **No pure black** `#000` — use `var(--sv-ink)`  
- **Glass cards:** `var(--sv-card)`, white 1.4px border, radius 16px  
- **Reference:** classic `/demo/beer-game` (BoxView, DecisionDock, evolution charts)

---

## Engine rules (do not break)

- Server/client math must match PRD §6 — see `src/engine/calculateRound.ts`  
- Backlog fulfilled before current demand  
- `incoming = floor(scheduled × supplyRate)` · supply rate ∈ [0, 1]  
- After last round, pipeline arrivals never process  
- Run `npm test` after any engine change  

---

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # engine + server unit tests
npm run smoke:api  # HTTP acceptance vs running dev server (BASE_URL optional)
npm run build
npm run lint
```

### Environment

Copy `.env.example` → `.env.local`:

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_USE_MOCK` | default mock on; `"false"` for live API |
| `NEXT_PUBLIC_API_URL` | backend base URL |
| `ADMIN_PIN` | server-only admin PIN (required in production; dev default `admin`) |
| `ADMIN_SESSION_SECRET` | optional HMAC secret for admin session cookies |

---

## Docs for other roles

| Doc | Audience |
|---|---|
| `docs/BACKEND_GUIDE.md` | Backend: formulas, tables, API, acceptance |
| `docs/API_CONTRACT.md` | Endpoint cheat sheet |
| `docs/DESIGN_SOURCE.md` | Design provenance from classic beer game |
| `docs/DEPLOY.md` | Live Mode: Render Starter + disk (or Railway) |

---

## Current state (2026-08-03)

- Standalone Next app with Cyan UI + PixelIcons + logos  
- PRD engine + unit tests (incl. full 12-round sim)  
- Offline mock: heats, attempts, live/final/global boards, report (default)  
- Playable loop: decide → **vehicle rail + round summary (one screen)** → report  
- **Backend (B1–B4):** Next.js API under `/api/retailer-challenge/*` + `src/server/*`  
  - Authoritative round settle via shared `src/engine`  
  - File store `.data/retailer-challenge.json` (local/dev; not multi-instance)  
  - Service tests in `src/server/__tests__/service.test.ts`  
  - Status notes: `docs/BACKEND_STATUS.md`  
  - Live mode: `NEXT_PUBLIC_USE_MOCK=false` (same-origin or `NEXT_PUBLIC_API_URL`)

### Known frontend gaps

- ~~Create-heat + show access code UX~~ (done: Host a Heat mode + code share + header badge)  
- ~~Live board polling during play~~ (done: 4s poll while status=playing)  
- ~~Official one-attempt UX~~ (done: practice vs official + email lock + friendly errors)  
- ~~True single-screen no-scroll densify~~ (done: 100dvh play shell + dense KPIs/charts)  
- ~~Progressive density~~ (done: rounds 1–2 simplified + stronger coach; 3+ charts/history)  
- ~~Onboarding fast path~~ (done: practice = avatar + name → start; heat/host full wizard)  
- ~~First-run interactive tutorial~~ (done: sample order → delay → costs; skippable once)  
- ~~Official irreversible confirm~~ (done: warning + checkbox before lock-in)  
- ~~Host classroom share~~ (done: large code, copy, QR, join link `?code=`, waiting copy)  

### Known backend gaps (B5–B6)

- Strong identity / OTP for official one-attempt (UI lock exists; no OTP yet)  
- Rate limits (admin login/probes only; player endpoints not limited yet)  
- Postgres (or other multi-instance) store  
- Staging E2E mock-off sign-off  
- ~~Admin config → server~~ (done: PUT config + admin editor dual-write)  

### Live deploy path (this week)

- **Preferred trial (no card):** Railway 30-day trial — `railway.toml` + volume at `/data`  
- **Production URL (trial):** `https://retailer-challenge-production.up.railway.app/`  
- **Alt paid:** Render Starter + disk — `render.yaml`  
- **Local share:** Cloudflare Tunnel + `next start` (PC must stay on)  
- **Runbook:** `docs/DEPLOY.md`  
- **Required env:** `NEXT_PUBLIC_USE_MOCK=false`, `DATA_DIR=/data` (Railway) or `/var/data` (Render)  
- **Do not** use Vercel until Postgres replaces the file store  

### Housekeeping done (2026-08-03)

- Purged unused Create-Next-App SVGs, orphan logos (space-name dupes / unused art), unused character stubs  
- Removed unused components: `GameDock.tsx`, `InfoPanelBanner.tsx` (no importers)  
- Confirmed `.data/` remains gitignored; `CLAUDE.md` → `@AGENTS.md` only


### Added from solo-beergame prototype (2026-08-02)

- Round history table, progress bar, mid-round coaching  
- Collapsible rules panel, per-round info panels  
- CYAN logo, PDF export, cost breakdown table  
- Play again (same heat / new solo fallback)  
- `timeline_unit` config (Round / Week)  

### Classic beer-game parity (2026-08-02)

- `StatusView` + FlowMarker truck/cart/package travel animation (exact classic pattern)  
- Post-submit confirmation banner (Decision Recorded)  
- Mid-round summary screen (KPIs + live heat position)  
- Final report: heat leaderboard + leader, BoxView KPIs, variability, experience summary, charts, PDF/CSV  

### Admin (2026-08-02)

- `/admin` section (solo-beergame creator parity for game stats/numbers)  
- Active config in `localStorage` (`retailer-challenge-admin-config-v1`); mock heats snapshot it  
- Admin auth: server `ADMIN_PIN` + HttpOnly session cookie (`POST /admin/login`); rate-limited  
- Mock offline unlock still uses local PIN `admin` (UI only; not used by live client)  
- Admin save: mock → localStorage; live → `PUT /configurations/:id` with session cookie + local cache  
- Scripts may send `X-Admin-Pin` (never baked into the browser bundle)  
- New live heats snapshot the **server** active config after admin save  

---

## Housekeeping

- **Canonical agent docs:** edit `AGENTS.md` only. `CLAUDE.md` is just `@AGENTS.md` — do not duplicate rules there.  
- **Local DB file store:** `.data/` is gitignored (see `.gitignore`). Never force-add `retailer-challenge.json` or any `.data/*`.  
- **Public assets:** only keep files referenced from `src/` (or intentional brand packs). Prefer `PixelIcons` over ad-hoc `public/logos/*` for new chrome.  
- **Dead components:** do not leave unused game UI shells (e.g. docks/banners with no importers).  

## Anti-patterns

- Do not import classic multiplayer `simulationStore` / WebSocket  
- Do not add 4-role supply chain to this product  
- Do not trust client costs/inventory when backend is on — server recomputes  
- Do not invent random demand/supply for fair heats  
- Do not commit `.env.local`, secrets, or **`.data/`** store dumps  
- Do not reintroduce Create-Next-App defaults (`public/next.svg`, `vercel.svg`, etc.)  
- Do not add duplicate logo filenames with spaces (`total cost.svg`) when kebab-case is used in code

---

## Out of scope

Classic multiplayer Beer Game, Redux LMS, facilitator creator, mobile-first, personality tiers.
