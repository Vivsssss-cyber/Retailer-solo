import { jsonError, jsonOk } from "@/server/http";
import { completeAttempt } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await context.params;
    const result = await completeAttempt(decodeURIComponent(attemptId));
    return jsonOk(result);
  } catch (err) {
    return jsonError(err);
  }
}
