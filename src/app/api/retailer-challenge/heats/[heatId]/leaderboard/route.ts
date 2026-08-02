import { jsonError, jsonOk } from "@/server/http";
import { getHeatLeaderboard } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ heatId: string }> },
) {
  try {
    const { heatId } = await context.params;
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode");
    const mode = modeParam === "final" ? "final" : "live";
    const rows = getHeatLeaderboard(decodeURIComponent(heatId), mode);
    // Frontend api.ts expects LeaderboardRow[] directly (not wrapped)
    // Contract guide shows both shapes — match live client: bare array
    return jsonOk(rows);
  } catch (err) {
    return jsonError(err);
  }
}
