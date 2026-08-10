import { migrateGameConfig } from "@/engine";
import { requireAdminPin } from "@/server/adminAuth";
import { ApiError } from "@/server/errors";
import { jsonError, jsonOk, parseJson } from "@/server/http";
import { assertRateLimit, clientIpFromRequest } from "@/server/rateLimit";
import {
  createHeat,
  getConfiguration,
  type CreateHeatBody,
} from "@/server/service";

export const dynamic = "force-dynamic";

/**
 * Create heat/group.
 * - solo: true → only when active config has solo_practice_enabled
 * - multiplayer group → admin credentials required
 */
export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `create-heat:${clientIpFromRequest(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const body = (await parseJson<CreateHeatBody>(request)) ?? {};
    const isSolo = body.solo === true;
    if (isSolo) {
      const config = migrateGameConfig(
        getConfiguration(body.configuration_id ?? "default"),
      );
      if (!config.solo_practice_enabled) {
        throw new ApiError(
          "BAD_REQUEST",
          "Solo practice is turned off. Join a group with the access code from your host.",
          403,
        );
      }
    } else {
      requireAdminPin(request);
    }
    const result = await createHeat(body);
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
