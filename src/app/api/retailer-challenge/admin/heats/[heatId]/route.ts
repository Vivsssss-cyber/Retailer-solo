import { requireAdmin } from "@/server/adminAuth";
import { jsonError, jsonOk } from "@/server/http";
import { deleteHeat, toggleHeatStatus } from "@/server/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ heatId: string }> },
) {
  try {
    requireAdmin(request);
    const { heatId } = await context.params;
    const nextStatus = await toggleHeatStatus(heatId);
    return jsonOk({ status: nextStatus });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ heatId: string }> },
) {
  try {
    requireAdmin(request);
    const { heatId } = await context.params;
    await deleteHeat(heatId);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
