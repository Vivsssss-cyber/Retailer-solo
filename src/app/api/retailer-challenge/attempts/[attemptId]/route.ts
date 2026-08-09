import { jsonError, jsonOk } from "@/server/http";
import { requirePlayerToken } from "@/server/playerAuth";
import { getAttempt } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await context.params;
    const id = decodeURIComponent(attemptId);
    requirePlayerToken(request, id);
    return jsonOk(getAttempt(id));
  } catch (err) {
    return jsonError(err);
  }
}
