import { jsonError, jsonOk } from "@/server/http";
import { requirePlayerToken } from "@/server/playerAuth";
import { completeAttempt } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await context.params;
    const id = decodeURIComponent(attemptId);
    requirePlayerToken(request, id);
    const result = await completeAttempt(id);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err);
  }
}
