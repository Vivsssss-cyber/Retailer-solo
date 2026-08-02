import { jsonError, jsonOk } from "@/server/http";
import { getGlobalLeaderboard } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    await context.params; // event scoped later; v1 uses configuration_id filter
    const url = new URL(request.url);
    const configurationId =
      url.searchParams.get("configuration_id") ?? "eu-retailer-challenge-v1";
    const officialOnly = url.searchParams.get("official_only") === "true";
    const rows = getGlobalLeaderboard(configurationId, { officialOnly });
    // Live client expects LeaderboardRow[] (same as mockAdapter)
    return jsonOk(rows);
  } catch (err) {
    return jsonError(err);
  }
}
