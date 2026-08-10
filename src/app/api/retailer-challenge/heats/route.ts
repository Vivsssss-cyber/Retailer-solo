import { requireAdminPin } from "@/server/adminAuth";
import { jsonError, jsonOk, parseJson } from "@/server/http";
import { createHeat, type CreateHeatBody } from "@/server/service";

export const dynamic = "force-dynamic";

/**
 * Create heat/room.
 * - solo: true  → public (practice)
 * - anything else (multiplayer room) → admin PIN required (demo gate, not production auth)
 */
export async function POST(request: Request) {
  try {
    const body = await parseJson<CreateHeatBody>(request);
    const isSolo = body?.solo === true;
    if (!isSolo) {
      requireAdminPin(request);
    }
    const result = await createHeat(body ?? {});
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
