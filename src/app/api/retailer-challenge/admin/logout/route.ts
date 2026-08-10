import {
  clearAdminSessionCookie,
  parseCookieHeader,
  revokeAdminSession,
  ADMIN_SESSION_COOKIE,
} from "@/server/adminSession";
import { jsonError, jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = parseCookieHeader(
      request.headers.get("cookie"),
      ADMIN_SESSION_COOKIE,
    );
    revokeAdminSession(token);
    const res = jsonOk({ ok: true as const });
    res.headers.set("Set-Cookie", clearAdminSessionCookie());
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
