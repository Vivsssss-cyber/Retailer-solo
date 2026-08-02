import { getHealth } from "@/server/service";
import { jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk(getHealth());
}
