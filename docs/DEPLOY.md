# Deploy — Live Mode (Railway trial / Render / tunnel)

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
| Survive redeploys | Persistent volume + `DATA_DIR` |
| Correct store model | **1 instance only** (never scale out) |

State file: `${DATA_DIR}/retailer-challenge.json` (default local: `./.data/…`).

---

## Recommended this week: Railway (30-day trial, no card)

Railway trial (as of 2026): **~$5 credit for 30 days, no credit card** for many signups  
(GitHub login). After trial, Free plan is only ~$1/mo credit — often **not enough** for 24/7.

Config in repo: [`railway.toml`](../railway.toml).

### Steps

1. Open [railway.com](https://railway.com) → **Login with GitHub** (`Vivsssss-cyber`).
2. **New Project** → **Deploy from GitHub repo** → **`Retailer-solo`** (branch `main`).
3. If the repo is missing: GitHub → Settings → Applications → Railway → allow **`Retailer-solo`**.
4. Railway will detect Node/Next. Confirm:
   - **Build:** `npm install && npm run build` (from `railway.toml`)
   - **Start:** `npm start`
5. **Variables** (Settings → Variables) — set **before** first successful build if possible:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` |
| `DATA_DIR` | `/data` |

   Mark `NEXT_PUBLIC_USE_MOCK` as available at **build time** (Railway: shared / build env).  
   Leave `NEXT_PUBLIC_API_URL` unset (same-origin API).  
   Railway sets `PORT` automatically — do not hardcode it.

6. **Volume** (important for heats surviving restarts):
   - Service → **Volumes** → Add volume  
   - Mount path: **`/data`**  
   - Size: 0.5–1 GB is enough  

7. **Networking** → **Generate domain** (e.g. `something.up.railway.app`).

8. Wait for deploy → open the public URL.

### Verify

```bash
# PowerShell
$env:BASE_URL="https://YOUR-APP.up.railway.app"
curl "$env:BASE_URL/api/retailer-challenge/health"
# → {"ok":true,"service":"retailer-challenge"}

npm run smoke:api
```

Browser: host heat on laptop → join from phone on the **same** Railway URL.

### Trial tips

| Tip | Why |
|---|---|
| One service only | Saves credit |
| Attach volume | Without it, redeploys wipe heats |
| Watch usage | $5 can run out before 30 days if always-on |
| Redeploy after env change | `NEXT_PUBLIC_*` is baked at build |

---

## Phase 0 — Local gate (before any host)

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

## Render (needs card for Starter)

See earlier plan: Web Service + disk at `/var/data`. Free tier sleeps — avoid for multiplayer heats.

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
