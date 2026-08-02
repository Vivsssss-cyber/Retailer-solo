# Backend status — Retailer Challenge

> Companion to [`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md) and [`API_CONTRACT.md`](./API_CONTRACT.md).

**Implemented in this monorepo** as Next.js App Router handlers under  
`src/app/api/retailer-challenge/*`, with domain logic in `src/server/*`.

Math is **not reimplemented** — handlers call `src/engine/*` (PRD source of truth).

---

## What ships (B1–B4)

| Area | Status | Location |
|---|---|---|
| Config seed + GET | Done | `GET /configurations/:id`, `GET /events/:id/configuration` |
| Heats create/get | Done | `POST /heats`, `GET /heats/:id`, `GET /heats/by-code/:code` |
| Attempts create/get | Done | `POST …/attempts`, `GET /attempts/:id` |
| Round submit (authoritative) | Done | `POST /attempts/:id/rounds` |
| Complete + report | Done | `POST /attempts/:id/complete` (+ `heat_winner_cost`) |
| Live / final heat boards | Done | `GET /heats/:id/leaderboard?mode=` |
| Global board | Done | `GET /events/:id/global-leaderboard` |
| Error codes | Done | `src/server/errors.ts` |
| Service tests | Done | `src/server/__tests__/service.test.ts` |
| Health | Done | `GET /health` |

### Partial / later (B5–B6)

| Area | Status |
|---|---|
| Strong identity (OTP/SSO) | Stub only: optional `player_identity` + `is_official` on create attempt |
| Rate limits | Not yet |
| Postgres / multi-instance store | File JSON store only (see below) |
| Staging E2E mock-off checklist | Manual — use env below |

---

## Architecture

```
src/engine/*          Pure PRD math (shared client + server)
src/server/
  service.ts          Business logic (heats, attempts, rounds, boards)
  store.ts            File-backed JSON (or memory in tests)
  leaderboard.ts      Live + final sort
  errors.ts / http.ts API error + NextResponse helpers
src/app/api/retailer-challenge/**/route.ts
                      HTTP surface matching API_CONTRACT
```

**Persistence:** `.data/retailer-challenge.json` (gitignored).  
Override directory with `DATA_DIR`.  
**Not** multi-instance safe (Vercel serverless will not share files). For production multi-node, replace `store.ts` with Postgres using the same domain model in BACKEND_GUIDE §4.

**Config snapshot:** On heat create, full `GameConfig` is frozen on the heat. Attempts use that snapshot only.

---

## How to run live backend

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=false
# same origin — leave API URL empty or set:
# NEXT_PUBLIC_API_URL=http://localhost:3000

npm run dev
```

### HTTP smoke (preferred acceptance check)

With `npm run dev` already running:

```bash
# default BASE_URL=http://localhost:3000
npm run smoke:api

# if Next picked another port:
BASE_URL=http://localhost:3002 npm run smoke:api
```

Covers: health, config, heat/attempt, round settle, double-submit 409, mid-game GET restore, full 12-round complete, no round 13, heat full, two-player live board order.

Quick manual:

```
GET  /api/retailer-challenge/health
GET  /api/retailer-challenge/configurations/default
```

Full play: open `/` with mock off — requests go to API routes instead of localStorage.

Keep mock on for pure UI work: `NEXT_PUBLIC_USE_MOCK=true`.

---

## Acceptance (from guide §11) — current

1. Golden math — engine unit tests + service full 12-round run  
2. Two-player live board order — covered in service tests  
3. Final sort — `sortFinal` + complete path  
4. Global completed only — service test  
5. GET attempt mid-game restore — service test  
6. Double-submit 409 — service test  
7. No post-game round — service test  
8. Heat full — solo max 1 / config max — service test  
9. Frontend mock off E2E — manual verification  

---

## Frontend safety

- Default remains **mock on** so UI demos never require the API.  
- Branch `front-end` on GitHub is the pre-backend snapshot.  
- Revert strategy: keep using mock, or reset to that branch.
