import { logSecurityEvent } from "./security.mts";
import { hashIp, getClientIp } from "./security.mts";

/**
 * Verifies the Authorization: Bearer <token> header against the
 * ADMIN_API_KEY environment variable. This is the ONLY gate on every
 * /api/admin/* route — there is no public UI or listing for this data.
 *
 * Returns null if authorized, or a Response to return immediately if not.
 */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const expected = Netlify.env.get("ADMIN_API_KEY");
  const authHeader = req.headers.get("authorization") || "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!expected) {
    // Fail closed: if the key isn't configured, nobody gets in.
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (!provided || !timingSafeEqual(provided, expected)) {
    const ip = getClientIp(req);
    await logSecurityEvent({
      event_type: "auth_failure",
      detail: `Invalid or missing admin token on ${new URL(req.url).pathname}`,
      ip_hash: await hashIp(ip),
      severity: "warning",
    });
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}

// Constant-time string comparison to avoid leaking key material via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
