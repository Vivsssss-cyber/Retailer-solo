import { jsonError, jsonOk, parseJson } from "@/server/http";
import { assertRateLimit, clientIpFromRequest } from "@/server/rateLimit";
import { createAttempt, type CreateAttemptBody } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ accessCode: string }> },
) {
  try {
    assertRateLimit({
      key: `create-attempt:${clientIpFromRequest(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    const { accessCode } = await context.params;
    const body = await parseJson<CreateAttemptBody>(request);
    const result = await createAttempt(
      decodeURIComponent(accessCode),
      body ?? { player_name: "Player" },
    );
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
