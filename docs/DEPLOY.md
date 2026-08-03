# Deploy — Live Mode (Render Starter + disk)

> Goal: share a public URL this week so **multiplayer heats work across phones**.  
> Architecture: one Next.js process + file store on a **persistent disk**.

Do **not** deploy to Vercel until the JSON file store is replaced with Postgres  
(see `BACKEND_STATUS.md` / `store.ts`).

---

## Why this shape

| Requirement | Setting |
|---|---|
| Live API (not browser mock) | `NEXT_PUBLIC_USE_MOCK=false` |
| Shared heats across devices | Same public origin; API on same app |
| Survive redeploys | Persistent disk + `DATA_DIR=/var/data` |
| Correct store model | **1 instance only** (never scale out) |

State file: `${DATA_DIR}/retailer-challenge.json` (default local: `./.data/…`).

---

## Phase 0 — Local gate (before Render)

```bash
# .env.local
NEXT_PUBLIC_USE_MOCK=false

npm test
npm run build
npm start
# other terminal:
npm run smoke:api
```

Manual:

1. Open `http://localhost:3000` — solo start works  
2. Host a heat → join from **incognito / second device** with the access code  
3. `GET /api/retailer-challenge/health` → `{"ok":true}`

Push a clean `main` (do not commit Windows `.lnk` shortcuts or `.env.local`).

---

## Phase 1 — Render (recommended)

### Option A — Blueprint (repo already has `render.yaml`)

1. Push `main` to GitHub.  
2. [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**.  
3. Connect the repo → apply `render.yaml`.  
4. Confirm plan is **Starter** (not free) for workshops.  
5. Deploy.

### Option B — Manual Web Service

1. **New +** → **Web Service** → connect GitHub repo → branch `main`.  
2. Settings:

| Field | Value |
|---|---|
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Instance type | **Starter** |
| Instances | **1** |
| Health check path | `/api/retailer-challenge/health` |

3. **Disk** (required for durable heats):

| Field | Value |
|---|---|
| Mount path | `/var/data` |
| Size | 1 GB |

4. **Environment**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` |
| `DATA_DIR` | `/var/data` |
| `NODE_VERSION` | `22` |

Leave `NEXT_PUBLIC_API_URL` **unset** (same-origin API).

5. **Create Web Service** → wait for the first build (usually a few minutes).

### After deploy — verify

```bash
# replace with your URL
set BASE_URL=https://retailer-challenge-xxxx.onrender.com

curl %BASE_URL%/api/retailer-challenge/health
# → {"ok":true}

# from repo root (PowerShell):
$env:BASE_URL="https://retailer-challenge-xxxx.onrender.com"; npm run smoke:api
```

Browser checklist:

- [ ] Home loads  
- [ ] Solo practice starts and submits a round  
- [ ] Host heat → second phone joins the code  
- [ ] Live leaderboard moves  
- [ ] Finish → report  
- [ ] Redeploy once → heat data still there (disk working)

---

## Railway alternative (same architecture)

1. New project → deploy from GitHub.  
2. Start: `npm start` · Build: `npm install && npm run build`.  
3. Attach a **volume** at `/var/data`.  
4. Env: `NEXT_PUBLIC_USE_MOCK=false`, `DATA_DIR=/var/data`, Node 22.  
5. Same health + `smoke:api` checks.

---

## Ops notes for a live workshop

| Topic | Guidance |
|---|---|
| Free tier | Sleeps when idle — **avoid for class heats** |
| Admin | PIN is still demo-grade (`admin` in source) — not real auth |
| Wipe data | Deleting the disk file / volume clears heats |
| Backup | Copy `/var/data/retailer-challenge.json` before risky deploys |
| Scaling | Never set instances > 1 until Postgres exists |
| Mock still on | Change env → **clear build cache / redeploy** (`NEXT_PUBLIC_*` is build-time) |

---

## Failure cheat sheet

| Symptom | Fix |
|---|---|
| Heats only work in one browser | Mock still on — set `NEXT_PUBLIC_USE_MOCK=false`, redeploy |
| Data gone after deploy | Add disk + `DATA_DIR=/var/data` |
| Slow first open | Free tier cold start — use Starter |
| Heat code not found | All players must use the **same** public URL |
| Health 404 | Wrong path — use `/api/retailer-challenge/health` |

---

## Success definition

1. Public HTTPS URL  
2. Health returns `{"ok":true}`  
3. `BASE_URL=<public> npm run smoke:api` passes  
4. Two devices share one heat  
5. Redeploy does not wipe heats (disk mounted)
