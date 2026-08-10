import { jsonError, jsonOk, parseJson } from "@/server/http";
import { assertRateLimit, clientIpFromRequest } from "@/server/rateLimit";
import { createHeat, type CreateHeatBody } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertRateLimit({
      key: `create-heat:${clientIpFromRequest(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    const body = await parseJson<CreateHeatBody>(request);
    const result = await createHeat(body ?? {});
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
