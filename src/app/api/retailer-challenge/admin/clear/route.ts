import { requireAdminPin } from "@/server/adminAuth";
import { jsonError, jsonOk } from "@/server/http";
import { clearAdminData } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireAdminPin(request);
    await clearAdminData();
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
