import { jsonError, jsonOk } from "@/server/http";
import { getEventConfiguration } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await context.params;
    return jsonOk(getEventConfiguration(eventId));
  } catch (err) {
    return jsonError(err);
  }
}
