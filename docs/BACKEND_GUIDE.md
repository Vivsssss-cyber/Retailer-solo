# Backend guide — Beer Game Sprint: The Retailer Challenge

**Audience:** Backend engineer implementing the real API for the frontend in `retailer-challenge/`.  
**Product PRD:** parent repo `Retailer Challenge.pdf`  
**Frontend reference implementation:** pure engine in `src/engine/` (this is the **source of truth for formulas**).  
**Client integration:** `src/services/api.ts` (live) / `src/services/mockAdapter.ts` (current offline mock).

---

## 1. What the backend owns

| Responsibility | Backend | Frontend |
|---|---|---|
| Game math (round settle) | **Authoritative recompute** | Optimistic UI / animation only |
| Persist attempts & rounds | **Yes** | localStorage only as offline fallback |
| Fair demand/supply sequences | **Serve fixed config** | Displays values from config |
| Live heat leaderboard | **Compute sort server-side** | Polls / displays |
| Final heat + global boards | **Yes** | Display only |
| Config versioning / fairness | **Yes** | Must send fingerprint context |
| Anti-cheat (order clamp, round lock) | **Yes** | Client validation is convenience only |
| Partner logos / event branding | **Serve URLs in config** | Renders |

**Do not** trust the client’s computed inventory/cost. Accept only `placed_order` (+ round index). Re-run PRD formulas on the server and store the result.

---

## 2. Product rules the API must enforce

1. **Single role:** Retailer only (no multi-echelon supply chain).  
2. **Independent players:** 1–4 per heat; each has their own inventory/orders (not a shared team board).  
3. **Same config for entire heat:** demand sequence, supply %, delay, costs — no per-player randomness.  
4. **Default EU seed (until ops overrides):**  
   - 12 rounds (max 15 if config allows)  
   - delivery delay 2  
   - inventory cost $5 / unit ending inventory  
   - backlog cost $10 / unit ending backlog  
5. **Orders:** non-negative integers; clamp to `[minimum_order, maximum_order]`.  
6. **End of game:** after final round is processed, stop. Orders still in the pipeline that would arrive after round N **never arrive** and must not affect cost.  
7. **No settlement UX:** final rounds use the same rules as mid-game.  
8. **One official attempt per participant per event** (recommended for EU): reject second `POST …/attempts` for same `event_id` + identity when `official: true`. Practice heats can allow unlimited.

---

## 3. Canonical formulas (must match frontend)

Port or reimplement **exactly** as `src/engine/calculateRound.ts` and `calculateReport.ts`.

### 3.1 Per round `t` (1-based)

```
OpeningInventory[t]  = EndingInventory[t-1]   // t=1 → starting_inventory
OpeningBacklog[t]    = EndingBacklog[t-1]     // t=1 → starting_backlog

ScheduledOrder[t]    = PlacedOrder[t - DeliveryDelay]
                     // if t - delay < 1: use starting_pipeline_orders[t-1]
                     // (pipeline index 0 = arrives on next process)

IncomingDelivery[t]  = floor(ScheduledOrder[t] × SupplyRate[t])
                     // 0 ≤ SupplyRate[t] ≤ 1; never deliver more than scheduled

AvailableUnits[t]    = OpeningInventory[t] + IncomingDelivery[t]
TotalRequirement[t]  = OpeningBacklog[t] + CustomerDemand[t]

// Backlog fulfilled before current demand
FulfilledBacklog[t]         = min(OpeningBacklog, Available)
InventoryAfterBacklog[t]    = Available - FulfilledBacklog
FulfilledCurrentDemand[t]   = min(CustomerDemand, InventoryAfterBacklog)

EndingInventory[t]   = max(Available - TotalRequirement, 0)
EndingBacklog[t]     = max(TotalRequirement - Available, 0)

InventoryCost[t]     = EndingInventory × InventoryCostPerUnit
BacklogCost[t]       = EndingBacklog × BacklogCostPerUnit
RoundCost[t]         = InventoryCost + BacklogCost
CumulativeCost[t]    = CumulativeCost[t-1] + RoundCost
```

**Pipeline after order:** drop arrived slot, shift remaining, append `placed_order` at the end (length = `delivery_delay`).

### 3.2 Report metrics (on complete)

| Metric | Definition |
|---|---|
| ImmediateDemandFillRate | Σ fulfilled_current_demand / Σ customer_demand |
| BacklogUnitWeeks | Σ ending_backlog |
| AverageInventory | Σ ending_inventory / total_rounds |
| Peak inventory / backlog | max ending_* |
| Rounds with backlog | count ending_backlog > 0 |
| AverageOrder | mean of placed_order |
| OrderVolatility | population stdev of placed_order |
| BullwhipRatio | Var(orders) / Var(demand) if Var(demand) > 0 else null |

Insights may be computed server-side or left to the client; if server returns them, use PRD templates (backlog-dominated / inventory-dominated / unstable / balanced).

### 3.3 Golden test cases (port to backend tests)

Frontend already has these — mirror them:

1. Scheduled 100 × supply 0.8 → delivery **80**  
2. Open inv 5, backlog 8, delivery 0, demand 10 → fulfill backlog first; end backlog **13**, end inv **0**  
3. Supply rate > 1 clamped → delivery never exceeds scheduled  
4. Full 12-round run: no round 13; post-game pipeline unused  

---

## 4. Domain model (suggested tables)

```
events
  id, name, configuration_id, starts_at, ends_at, …

configurations
  configuration_id (PK)
  configuration_version
  demand_sequence_id
  supply_sequence_id
  partner_logo_url
  intro_text
  game_name
  total_rounds
  delivery_delay
  starting_inventory
  starting_backlog
  starting_pipeline_orders   JSON int[]
  customer_demand_by_round   JSON int[]
  supply_rate_by_round       JSON float[]  // 0..1
  inventory_cost_per_unit
  backlog_cost_per_unit
  minimum_order
  maximum_order
  maximum_players_per_heat
  leaderboard_enabled
  global_leaderboard_enabled
  animation_enabled
  result_insight_thresholds  JSON optional
  is_official                bool

heats
  heat_id
  access_code                unique, short (e.g. 6 chars)
  event_id?                  nullable for free practice
  configuration_id
  configuration_version      // snapshot at create time
  configuration_snapshot     JSON full GameConfig (immutable for heat)
  max_players
  created_at
  status                     open | closed

attempts
  attempt_id
  heat_id
  event_id?
  player_name
  player_identity            // email / device / auth subject for “one official attempt”
  is_official
  status                     playing | completed
  current_round              // next round to play (1..total_rounds)
  pipeline                   JSON int[]
  inventory
  backlog
  cumulative_cost
  started_at
  completed_at?
  // denormalized fingerprint fields for leaderboard queries
  configuration_id, configuration_version, demand_sequence_id, supply_sequence_id, …

round_records
  attempt_id
  round                      unique together
  opening_inventory
  opening_backlog
  scheduled_order
  supply_rate
  incoming_delivery
  customer_demand
  fulfilled_backlog
  fulfilled_current_demand
  ending_inventory
  ending_backlog
  placed_order
  inventory_cost
  backlog_cost
  round_cost
  cumulative_cost
  completed_at
```

**Config snapshot:** When a heat is created, freeze the full `GameConfig` JSON on the heat. All attempts in that heat use the snapshot (not a later edited config).

---

## 5. HTTP API

**Base path:** `{API_URL}/api/retailer-challenge`  
**Content-Type:** `application/json`  
**Auth (v1 recommendation):**

| Mode | Auth |
|---|---|
| Guest event | Optional short-lived token returned on createAttempt; `Authorization: Bearer …` |
| Practice solo | Same, or open with rate limits |
| Official EU | Stronger identity (email OTP / SSO) + one-attempt lock |

CORS: allow the frontend origin(s).

### 5.1 Health

```
GET /health → { "ok": true }
```

### 5.2 Configuration

```
GET /configurations/:configurationId
→ GameConfig

GET /events/:eventId/configuration
→ GameConfig   // official config for that event
```

### 5.3 Heats

```
POST /heats
body: {
  "event_id": "optional",
  "configuration_id": "eu-retailer-challenge-v1",
  "solo": false,
  "host_player_name": "optional"
}
→ {
  "heat_id": "heat_…",
  "access_code": "ABC123",
  "configuration": { …GameConfig snapshot… }
}
```

Rules:

- Generate unique human-friendly `access_code` (case-insensitive join).  
- `solo: true` → heat max_players = 1 is OK, or still allow 4 for “invite later”.  
- Return **full configuration snapshot** so the client never guesses sequences.

```
GET /heats/:heatId
GET /heats/by-code/:accessCode
→ { heat_id, access_code, configuration, attempt_count, max_players, status }
```

### 5.4 Attempts

```
POST /heats/:heatId/attempts
// or POST /heats/by-code/:accessCode/attempts
body: { "player_name": "Ava" }
→ Attempt   // status playing, current_round 1, empty rounds[], pipeline = starting_pipeline
```

Rules:

- Reject if heat full (`attempt_count >= maximum_players_per_heat`) → **409**.  
- Official event: reject second attempt for same identity → **409** `{ "code": "ALREADY_ATTEMPTED" }`.  
- Snapshot configuration onto the attempt.

```
GET /attempts/:attemptId
→ Attempt including rounds[]
```

Used for **refresh recovery**. Must return enough state to resume UI without replaying.

### 5.5 Submit round (core write path)

```
POST /attempts/:attemptId/rounds
body: {
  "round": 3,
  "placed_order": 12
}
→ {
  "accepted": true,
  "round_record": { … },
  "attempt": { … updated … },
  "live_heat_board": [ LeaderboardRow, … ]
}
```

**Server steps:**

1. Load attempt; must be `playing`.  
2. `body.round` must equal `attempt.current_round` else **409**.  
3. Clamp `placed_order` to config min/max; reject non-integers.  
4. Derive scheduled order from pipeline / history + delay.  
5. Look up `supply_rate` and `customer_demand` for this round from **snapshot** (never from client).  
6. Compute full `round_record`; append; update inventory, backlog, cumulative_cost, pipeline.  
7. If `current_round` was last round: set `status=completed`, `completed_at=now`.  
8. Return updated attempt + **live** heat board (sorted).

**Idempotency:** Prefer `Idempotency-Key` header or reject duplicate round with **409** `{ "code": "ROUND_LOCKED" }`.

### 5.6 Complete / report

```
POST /attempts/:attemptId/complete
→ {
  "attempt": { … },
  "report": { PerformanceReport },
  "heat_rank": 2,
  "global_rank": 15,
  "live_heat_board": [ … ],   // if all heat finished, may use final sort
  "heat_winner_cost": 1200
}
```

Idempotent if already completed.  
`heat_winner_cost` = min final cost among **completed** attempts in the heat (for “gap to winner” UI).

### 5.7 Leaderboards

```
GET /heats/:heatId/leaderboard?mode=live|final
→ { "mode": "live", "rows": [ LeaderboardRow ] }
```

**Live sort (while anyone still playing):**

1. `completed_round` DESC (rounds finished; for in-progress use `rounds.length` or `current_round - 1` consistently — frontend uses **number of completed rounds**)  
2. `cumulative_cost` ASC  
3. Earliest relevant timestamp (e.g. last round `completed_at` or attempt start)

**Final sort (all heat members completed, or `mode=final`):**

1. Final cumulative cost ASC  
2. Backlog unit-weeks ASC  
3. Order volatility ASC  
4. Earliest completion time  

Include on every row:

```
position, player_name, completed_round, cumulative_cost, status,
completed_at?, configuration_id, configuration_version,
demand_sequence_id, supply_sequence_id, total_rounds,
delivery_delay, inventory_cost, backlog_cost,
immediate_fill_rate?, backlog_unit_weeks?, order_volatility?
```

```
GET /events/:eventId/global-leaderboard
    ?configuration_id=eu-retailer-challenge-v1
    &configuration_version=1
→ { "rows": [ … ] }
```

- Only `status=completed` **and** `is_official=true` (if you distinguish practice).  
- Only matching configuration fingerprint.  
- Final sort as above.  
- Cap rows (e.g. top 100) with optional pagination later.

---

## 6. Response shapes (TypeScript-compatible)

Align field names with frontend `src/engine/types.ts` (snake_case on round records).

### GameConfig

```ts
{
  configuration_id: string
  configuration_version: number
  demand_sequence_id: string
  supply_sequence_id: string
  partner_logo?: string          // absolute HTTPS URL preferred
  intro_text: string
  game_name: string
  total_rounds: number           // default 12, max 15
  delivery_delay: number         // default 2
  starting_inventory: number
  starting_backlog: number
  starting_pipeline_orders: number[]  // length === delivery_delay
  customer_demand_by_round: number[]  // length === total_rounds
  supply_rate_by_round: number[]      // length === total_rounds, each 0..1
  inventory_cost_per_unit: number
  backlog_cost_per_unit: number
  minimum_order: number
  maximum_order: number
  maximum_players_per_heat: number    // default 4
  leaderboard_enabled: boolean
  global_leaderboard_enabled: boolean
  animation_enabled: boolean
}
```

### Attempt

```ts
{
  attempt_id: string
  heat_id: string
  player_name: string
  configuration: GameConfig     // snapshot
  status: "playing" | "completed"
  current_round: number         // next round to submit (if completed, last round number)
  pipeline: number[]
  inventory: number
  backlog: number
  cumulative_cost: number
  rounds: RoundRecord[]
  started_at: string            // ISO-8601
  completed_at?: string
}
```

### RoundRecord

All fields in PRD §8 (see API_CONTRACT.md). All money as numbers (not strings).

---

## 7. Error contract

Use HTTP status + JSON body:

```json
{
  "error": "Human readable message",
  "code": "ROUND_LOCKED"
}
```

| Code | HTTP | When |
|---|---|---|
| `HEAT_NOT_FOUND` | 404 | Bad heat id / code |
| `HEAT_FULL` | 409 | Max players |
| `ATTEMPT_NOT_FOUND` | 404 | |
| `ALREADY_ATTEMPTED` | 409 | Official one-shot |
| `ROUND_LOCKED` | 409 | Round already submitted |
| `ROUND_MISMATCH` | 409 | Client round ≠ server current |
| `ATTEMPT_COMPLETED` | 409 | Submit after complete |
| `INVALID_ORDER` | 400 | Non-integer / out of range before clamp policy |
| `CONFIG_MISMATCH` | 400 | Client tried wrong config version |

Frontend can surface `error` string as-is.

---

## 8. Realtime / polling expectations

v1 does **not** require WebSockets.

Frontend will poll during play, e.g.:

```
GET /heats/:heatId/leaderboard?mode=live
every 3–5 seconds while status=playing
```

Requirements:

- Cheap query (indexes on `heat_id`, `status`, `cumulative_cost`).  
- Stable sort.  
- Low payload (top 4–8 rows is enough for UI).

Optional later: SSE/WebSocket `heat.leaderboard.updated`.

---

## 9. Environment & integration with frontend

Frontend env:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | e.g. `https://api.example.com` |
| `NEXT_PUBLIC_USE_MOCK` | set to `"false"` to use live `api.ts` |

Live client paths (see `src/services/api.ts`):

```
GET  {base}/api/retailer-challenge/configurations/:id
POST {base}/api/retailer-challenge/heats
POST {base}/api/retailer-challenge/heats/:heatId/attempts
GET  {base}/api/retailer-challenge/attempts/:attemptId
POST {base}/api/retailer-challenge/attempts/:attemptId/rounds
POST {base}/api/retailer-challenge/attempts/:attemptId/complete
GET  {base}/api/retailer-challenge/heats/:heatId/leaderboard?mode=live|final
GET  {base}/api/retailer-challenge/events/default/global-leaderboard?configuration_id=…
```

If you prefer different path prefixes, coordinate a one-line change in `api.ts` — keep response bodies identical.

---

## 10. Security checklist

- [ ] Rate-limit `POST …/rounds` and heat creation  
- [ ] Do not accept client-supplied inventory, cost, demand, or supply rate  
- [ ] Validate array lengths on config admin writes  
- [ ] Snapshot config per heat (immutable mid-heat)  
- [ ] Separate practice vs official leaderboards  
- [ ] CORS locked to known frontends  
- [ ] No PII beyond player display name unless event requires it  
- [ ] Access codes not enumerable (rate-limit code lookup)

---

## 11. Acceptance criteria for “backend done”

Backend is ready for frontend cutover when:

1. **Golden math tests** pass (PRD examples + full 12-round sim).  
2. Create heat → join by code → 2 players submit rounds → live board order matches PRD race sort.  
3. Both complete → final heat order matches cost / backlog-weeks / volatility / time.  
4. Global board only shows completed official attempts with matching fingerprint.  
5. Refresh mid-game: `GET attempt` restores exact round, pipeline, inventory.  
6. Double-submit same round returns 409 and does not double-charge cost.  
7. Order after last round rejected; pipeline after end does not create extra cost.  
8. Heat full at 4 returns 409.  
9. Frontend `NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_API_URL` completes a full solo run end-to-end.

---

## 12. Suggested implementation order

| Sprint | Deliverable |
|---|---|
| B1 | Config CRUD/seed + `GET configuration` |
| B2 | Heats + attempts create/get + round submit with pure engine |
| B3 | Leaderboards live + final + global |
| B4 | Complete/report ranks + heat_winner_cost |
| B5 | Official one-attempt + identity + rate limits |
| B6 | Staging E2E with frontend mock off |

---

## 13. What you can reuse from this repo

| Asset | Path | Use |
|---|---|---|
| Round formulas | `src/engine/calculateRound.ts` | Port 1:1 to backend language |
| Report metrics | `src/engine/calculateReport.ts` | Port 1:1 |
| Pipeline helpers | `src/engine/pipeline.ts` | Port 1:1 |
| Default EU seed | `src/engine/defaultConfig.ts` | Initial config seed |
| Unit tests | `src/engine/__tests__/*.ts` | Spec for backend tests |
| Mock behavior | `src/services/mockAdapter.ts` | Behavioral reference (not production) |
| Thin REST client | `src/services/api.ts` | Exact paths frontend calls |

**Prefer porting the TypeScript engine modules** into a shared package or rewriting with the same tests over inventing alternate math.

---

## 14. Out of scope for v1 backend

- Multi-role beer game (wholesaler / factory)  
- Random demand generators  
- WebSocket multiplayer turn locks  
- Facilitator LMS / classic-simulations run IDs  
- Mobile push notifications  

---

## 15. Contact points / open product decisions

Confirm with product before hardcoding:

1. Official demand/supply sequences (current frontend seed is provisional).  
2. Whether practice runs appear on global board.  
3. Identity model for “one attempt per person”.  
4. Partner logo URL hosting.  
5. Event id model (single EU event vs multi-event).

---

## Quick reference — PRD sorting

**Live heat:** higher completed rounds first → lower cost → earlier time.  
**Final / global:** lower final cost → lower backlog-unit-weeks → lower order volatility → earlier completion.

**Fairness fingerprint (store on every leaderboard row):**  
`configuration_id`, `configuration_version`, `demand_sequence_id`, `supply_sequence_id`, `total_rounds`, `delivery_delay`, `inventory_cost`, `backlog_cost`.
