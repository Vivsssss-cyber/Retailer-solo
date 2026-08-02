# Beer Game Sprint: The Retailer Challenge

Independent Next.js app for the EU single-player supply-chain challenge.

- **Design:** Cyan system (ported from `classic-simulations-frontend`)  
- **Rules:** `../Retailer Challenge.pdf`  
- **Agents / AI:** see [`AGENTS.md`](./AGENTS.md) (also loaded via `CLAUDE.md`)

## Quick start

```bash
cd retailer-challenge
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → enter a name → **Solo practice**.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Engine unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | mock on | Set `false` to use live API |
| `NEXT_PUBLIC_API_URL` | unset | Backend base URL |

See `.env.example`. Never commit `.env.local`.

## Architecture

| Path | Role |
|---|---|
| `src/engine` | Pure PRD math (source of truth) |
| `src/services/mockAdapter.ts` | Offline heats / attempts / boards |
| `src/services/api.ts` | Live REST client |
| `src/store/useAttemptStore.ts` | Play UI state |
| `docs/BACKEND_GUIDE.md` | **Backend implementer guide** |
| `docs/API_CONTRACT.md` | Endpoint cheat sheet |
| `docs/DESIGN_SOURCE.md` | Design provenance |

## Relationship to classic simulations

Sibling product — **not** a mode of the 4-role multiplayer Beer Game.  
Visual reference: classic route `/demo/beer-game`.

## License / internal

Internal CYAN / project use unless otherwise specified.
