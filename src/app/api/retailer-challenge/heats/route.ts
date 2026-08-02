import { jsonError, jsonOk, parseJson } from "@/server/http";
import { createHeat, type CreateHeatBody } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await parseJson<CreateHeatBody>(request);
    const result = await createHeat(body ?? {});
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
