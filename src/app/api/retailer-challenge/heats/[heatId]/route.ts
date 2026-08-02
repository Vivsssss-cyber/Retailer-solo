import { jsonError, jsonOk } from "@/server/http";
import { getHeat } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ heatId: string }> },
) {
  try {
    const { heatId } = await context.params;
    return jsonOk(getHeat(decodeURIComponent(heatId)));
  } catch (err) {
    return jsonError(err);
  }
}
