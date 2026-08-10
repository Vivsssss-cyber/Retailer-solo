import { requireAdmin } from "@/server/adminAuth";
import { jsonError, jsonOk } from "@/server/http";
import { clearAdminData } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireAdmin(request);
    await clearAdminData();
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
