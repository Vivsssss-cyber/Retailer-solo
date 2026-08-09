import { ApiError } from "@/server/errors";
import { jsonError, jsonOk, parseJson } from "@/server/http";
import { requirePlayerToken } from "@/server/playerAuth";
import { assertRateLimit, clientIpFromRequest } from "@/server/rateLimit";
import { submitRound, type SubmitRoundBody } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ attemptId: string }> },
) {
  try {
    assertRateLimit({
      key: `submit-round:${clientIpFromRequest(request)}`,
      limit: 120,
      windowMs: 60_000,
    });
    const { attemptId } = await context.params;
    const id = decodeURIComponent(attemptId);
    requirePlayerToken(request, id);
    const body = await parseJson<SubmitRoundBody>(request);
    if (body == null || typeof body.round !== "number") {
      throw new ApiError("BAD_REQUEST", "round is required");
    }
    if (typeof body.placed_order !== "number") {
      throw new ApiError("INVALID_ORDER", "placed_order is required");
    }
    const result = await submitRound(id, body);
    return jsonOk(result);
  } catch (err) {
    return jsonError(err);
  }
}
