import { jsonError, jsonOk } from "@/server/http";
import { getAttempt } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await context.params;
    return jsonOk(getAttempt(decodeURIComponent(attemptId)));
  } catch (err) {
    return jsonError(err);
  }
}
