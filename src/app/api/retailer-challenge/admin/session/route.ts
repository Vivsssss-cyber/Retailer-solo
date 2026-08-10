import { isAdminAuthenticated } from "@/server/adminAuth";
import { jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return jsonOk({ authenticated: isAdminAuthenticated(request) });
}
