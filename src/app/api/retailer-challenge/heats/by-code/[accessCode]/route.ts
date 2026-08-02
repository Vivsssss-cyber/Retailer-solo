import { jsonError, jsonOk } from "@/server/http";
import { getHeat } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accessCode: string }> },
) {
  try {
    const { accessCode } = await context.params;
    return jsonOk(getHeat(decodeURIComponent(accessCode)));
  } catch (err) {
    return jsonError(err);
  }
}
