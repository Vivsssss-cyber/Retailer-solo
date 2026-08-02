import { jsonError, jsonOk } from "@/server/http";
import { getConfiguration } from "@/server/service";

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
