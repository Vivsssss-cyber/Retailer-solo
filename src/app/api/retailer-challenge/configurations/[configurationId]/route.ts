import type { GameConfig } from "@/engine";
import { requireAdmin } from "@/server/adminAuth";
import { ApiError } from "@/server/errors";
import { jsonError, jsonOk, parseJson } from "@/server/http";
import { getConfiguration, upsertConfiguration } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ configurationId: string }> },
) {
  try {
    const { configurationId } = await context.params;
    return jsonOk(getConfiguration(configurationId));
  } catch (err) {
    return jsonError(err);
  }
}

/** Admin: replace configuration and (by default) make it the active seed for new heats. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ configurationId: string }> },
) {
  try {
    requireAdmin(request);
    const { configurationId } = await context.params;
    const body = await parseJson<GameConfig>(request);
    if (!body || typeof body !== "object") {
      throw new ApiError("BAD_REQUEST", "Invalid config body");
    }
    const id = decodeURIComponent(configurationId);
    const payload: GameConfig = {
      ...body,
      configuration_id:
        id === "default"
          ? body.configuration_id
          : body.configuration_id || id,
    };
    const saved = await upsertConfiguration(payload, { makeDefault: true });
    return jsonOk(saved);
  } catch (err) {
    return jsonError(err);
  }
}
