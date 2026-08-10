/**
 * HTTP smoke against a running Next server (mock off not required — hits API routes directly).
 *
 *   node scripts/smoke-api.mjs
 *   BASE_URL=http://localhost:3000 node scripts/smoke-api.mjs
 *
 * Exit 0 on success. Prints FAIL + exits 1 on first broken step.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API = `${BASE}/api/retailer-challenge`;

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`  FAIL  ${msg}`);
    failed += 1;
    throw new Error(msg);
  }
  console.log(`  ok    ${msg}`);
}

async function req(path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log(`Smoke → ${API}\n`);

  // 1. Health
  {
    const { res, body } = await req("/health");
    assert(res.ok, `health ${res.status}`);
    assert(body?.ok === true, "health.ok");
  }

  // 2. Config
  {
    const { res, body } = await req("/configurations/default");
    assert(res.ok, `config ${res.status}`);
    assert(body?.total_rounds === 12, "config.total_rounds=12");
    assert(Array.isArray(body?.customer_demand_by_round), "config.demand array");
  }

  // 3. Solo heat + attempt
  let heatId;
  let attemptId;
  let playerToken;
  {
    const { res, body } = await req("/heats", {
      method: "POST",
      body: JSON.stringify({ solo: true }),
    });
    assert(res.status === 201 || res.ok, `create heat ${res.status}`);
    heatId = body.heat_id;
    assert(!!heatId, "heat_id present");
    assert(!!body.access_code, "access_code present");
    assert(!!body.configuration, "configuration snapshot present");
  }

  {
    const { res, body } = await req(`/heats/${encodeURIComponent(heatId)}/attempts`, {
      method: "POST",
      body: JSON.stringify({ player_name: "Smoke Tester" }),
    });
    assert(res.status === 201 || res.ok, `create attempt ${res.status}`);
    // Shape: { attempt, player_token }
    attemptId = body.attempt?.attempt_id ?? body.attempt_id;
    playerToken = body.player_token;
    assert(!!attemptId, "attempt_id present");
    assert(!!playerToken, "player_token present");
    const att = body.attempt ?? body;
    assert(att.current_round === 1, "current_round=1");
    assert(att.status === "playing", "status=playing");
    assert(att.rounds?.length === 0, "empty rounds");
  }

  const playerHeaders = { "X-Player-Token": playerToken };

  // 3b. Missing token rejected
  {
    const { res, body } = await req(`/attempts/${encodeURIComponent(attemptId)}`);
    assert(res.status === 401, `get without token → 401 got ${res.status}`);
    assert(body?.code === "FORBIDDEN" || res.status === 401, "forbidden code");
  }

  // 4. Round 1 submit
  let afterR1;
  {
    const { res, body } = await req(`/attempts/${encodeURIComponent(attemptId)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 1, placed_order: 6 }),
      headers: playerHeaders,
    });
    assert(res.ok, `submit r1 ${res.status} ${JSON.stringify(body)}`);
    assert(body.accepted === true, "accepted");
    assert(body.round_record?.round === 1, "record.round=1");
    assert(body.round_record?.placed_order === 6, "placed_order=6");
    assert(body.attempt?.current_round === 2, "advanced to round 2");
    afterR1 = body.attempt;
  }

  // 5. Double-submit r1 → 409 ROUND_LOCKED or ROUND_MISMATCH
  {
    const { res, body } = await req(`/attempts/${encodeURIComponent(attemptId)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 1, placed_order: 99 }),
      headers: playerHeaders,
    });
    assert(res.status === 409, `double-submit status 409 got ${res.status}`);
    assert(
      body?.code === "ROUND_LOCKED" || body?.code === "ROUND_MISMATCH",
      `double-submit code ${body?.code}`,
    );
  }

  // 6. Resume mid-game
  {
    const { res, body } = await req(`/attempts/${encodeURIComponent(attemptId)}`, {
      headers: playerHeaders,
    });
    assert(res.ok, `get attempt ${res.status}`);
    assert(body.current_round === 2, "resume current_round=2");
    assert(body.inventory === afterR1.inventory, "resume inventory match");
    assert(
      JSON.stringify(body.pipeline) === JSON.stringify(afterR1.pipeline),
      "resume pipeline match",
    );
    assert(body.rounds?.length === 1, "resume one round");
  }

  // 7. Finish remaining rounds
  {
    for (let r = 2; r <= 12; r++) {
      const { res, body } = await req(
        `/attempts/${encodeURIComponent(attemptId)}/rounds`,
        {
          method: "POST",
          body: JSON.stringify({ round: r, placed_order: 6 }),
          headers: playerHeaders,
        },
      );
      assert(res.ok, `submit r${r} ${res.status}`);
      if (r === 12) {
        assert(body.attempt?.status === "completed", "completed after r12");
        assert(body.attempt?.rounds?.length === 12, "12 round records");
      }
    }
  }

  // 8. No round 13
  {
    const { res, body } = await req(`/attempts/${encodeURIComponent(attemptId)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 13, placed_order: 1 }),
      headers: playerHeaders,
    });
    assert(res.status === 409, `r13 rejected 409 got ${res.status}`);
    assert(!!body?.code, `r13 has code ${body?.code}`);
  }

  // 9. Complete + report
  {
    const { res, body } = await req(
      `/attempts/${encodeURIComponent(attemptId)}/complete`,
      { method: "POST", headers: playerHeaders },
    );
    assert(res.ok, `complete ${res.status}`);
    assert(typeof body.report?.final_cumulative_cost === "number", "report cost");
    assert(body.heat_rank === 1, "solo heat_rank=1");
    assert(Array.isArray(body.live_heat_board), "live_heat_board array");
  }

  // 9b. Admin login + data (dev default PIN if ADMIN_PIN unset)
  {
    const pin = process.env.ADMIN_PIN || "Cyan#866$R3t@il";
    const { res, body } = await req("/admin/login", {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
    assert(res.ok, `admin login ${res.status} ${JSON.stringify(body)}`);
    const setCookie = res.headers.get("set-cookie") || "";
    assert(setCookie.includes("rc_admin_session"), "admin session cookie set");
  }

  // 10. Heat full (solo max 1)
  {
    const { res: hRes, body: heat } = await req("/heats", {
      method: "POST",
      body: JSON.stringify({ solo: true }),
    });
    assert(hRes.ok, "second heat");
    await req(`/heats/${encodeURIComponent(heat.heat_id)}/attempts`, {
      method: "POST",
      body: JSON.stringify({ player_name: "One" }),
    });
    const { res, body } = await req(
      `/heats/${encodeURIComponent(heat.heat_id)}/attempts`,
      {
        method: "POST",
        body: JSON.stringify({ player_name: "Two" }),
      },
    );
    assert(res.status === 409, `heat full 409 got ${res.status}`);
    assert(body?.code === "HEAT_FULL", `HEAT_FULL got ${body?.code}`);
  }

  // 11. Two-player live board
  {
    const { body: heat } = await req("/heats", {
      method: "POST",
      body: JSON.stringify({ solo: false }),
    });
    const { body: fast } = await req(
      `/heats/${encodeURIComponent(heat.heat_id)}/attempts`,
      { method: "POST", body: JSON.stringify({ player_name: "Fast" }) },
    );
    const { body: slow } = await req(
      `/heats/${encodeURIComponent(heat.heat_id)}/attempts`,
      { method: "POST", body: JSON.stringify({ player_name: "Slow" }) },
    );
    await req(`/attempts/${encodeURIComponent(fast.attempt_id)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 1, placed_order: 8 }),
    });
    await req(`/attempts/${encodeURIComponent(fast.attempt_id)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 2, placed_order: 8 }),
    });
    await req(`/attempts/${encodeURIComponent(slow.attempt_id)}/rounds`, {
      method: "POST",
      body: JSON.stringify({ round: 1, placed_order: 0 }),
    });

    const { res, body: board } = await req(
      `/heats/${encodeURIComponent(heat.heat_id)}/leaderboard?mode=live`,
    );
    assert(res.ok, `live board ${res.status}`);
    assert(Array.isArray(board), "board is array");
    assert(board[0]?.player_name === "Fast", `live leader is Fast got ${board[0]?.player_name}`);
    assert(board[0]?.completed_round === 2, "Fast completed_round=2");
  }

  console.log("\nAll smoke checks passed.");
}

main().catch((err) => {
  if (failed === 0) {
    console.error("\nSmoke aborted:", err.message);
    // connection errors etc.
    process.exit(1);
  }
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
});
