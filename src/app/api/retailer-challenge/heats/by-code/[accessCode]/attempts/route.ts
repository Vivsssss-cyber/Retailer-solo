import { jsonError, jsonOk, parseJson } from "@/server/http";
import { createAttempt, type CreateAttemptBody } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ accessCode: string }> },
) {
  try {
    const { accessCode } = await context.params;
    const body = await parseJson<CreateAttemptBody>(request);
    const attempt = await createAttempt(
      decodeURIComponent(accessCode),
      body ?? { player_name: "Player" },
    );
    return jsonOk(attempt, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
