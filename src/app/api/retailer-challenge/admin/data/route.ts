import { requireAdmin } from "@/server/adminAuth";
import { jsonError, jsonOk } from "@/server/http";
import { getAdminData, getAdminStats } from "@/server/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    requireAdmin(request);
    const data = getAdminData();
    const stats = getAdminStats();
    return jsonOk({ ...data, stats });
  } catch (err) {
    return jsonError(err);
  }
}
