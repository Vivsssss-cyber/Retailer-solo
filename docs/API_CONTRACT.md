# Retailer Challenge — API contract (endpoint cheat sheet)

> **Full backend expectations:** see [`BACKEND_GUIDE.md`](./BACKEND_GUIDE.md)  
> (auth, domain model, formulas, errors, acceptance criteria).

Base URL: `{NEXT_PUBLIC_API_URL}/api/retailer-challenge`

Frontend uses mock adapter when `NEXT_PUBLIC_USE_MOCK` is not `"false"` or API URL is unset.

## Configuration

### `GET /configurations/:configurationId`

Returns full `GameConfig` (see `src/engine/types.ts`).

### `GET /events/:eventId/configuration`

Resolves the official event configuration.

## Heats & attempts

### `POST /heats`

```json
{ "player_name": "optional", "configuration_id": "eu-retailer-challenge-v1", "solo": true }
```

→ `{ heat_id, access_code, configuration }`

### `POST /heats/:heatId/attempts`

```json
{ "player_name": "Ava" }
```

→ `Attempt` with `current_round: 1`, starting inventory/pipeline.

### `GET /attempts/:attemptId`

→ full attempt + `rounds[]`.

### `POST /attempts/:attemptId/rounds`

```json
{ "round": 3, "placed_order": 12 }
```

Server **recomputes** with PRD formulas. Reject if round already locked or out of range.

→ `{ accepted, round_record, attempt, live_heat_board[] }`

### `POST /attempts/:attemptId/complete`

→ `{ attempt, report, heat_rank, global_rank, live_heat_board }`

## Leaderboards

### `GET /heats/:heatId/leaderboard?mode=live|final`

**Live sort:** completed_round DESC → cumulative_cost ASC → earliest timestamp  
**Final sort:** final cost ASC → backlog_unit_weeks ASC → order_volatility ASC → earliest completion

### `GET /events/:eventId/global-leaderboard?configuration_id=&version=`

Completed attempts only; matching configuration fingerprint.

## Round record fields

`opening_inventory`, `opening_backlog`, `scheduled_order`, `supply_rate`, `incoming_delivery`, `customer_demand`, `fulfilled_backlog`, `fulfilled_current_demand`, `ending_inventory`, `ending_backlog`, `placed_order`, `inventory_cost`, `backlog_cost`, `round_cost`, `cumulative_cost`, `completed_at`

## Fairness fingerprint

Every leaderboard row stores:  
`configuration_id`, `configuration_version`, `demand_sequence_id`, `supply_sequence_id`, `total_rounds`, `delivery_delay`, `inventory_cost`, `backlog_cost`
