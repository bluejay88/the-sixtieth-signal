import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 500);
    const offset = Number(url.searchParams.get("offset") || 0);
    const status = url.searchParams.get("status");

    const rows = status
      ? await db.sql`
          SELECT id, name, email, format_pref, age_range, region, source, status, created_at
          FROM subscribers WHERE status = ${status}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `
      : await db.sql`
          SELECT id, name, email, format_pref, age_range, region, source, status, created_at
          FROM subscribers
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `;

    return Response.json({ subscribers: rows, limit, offset });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id || !body?.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const [updated] = await db.sql`
      UPDATE subscribers SET status = ${body.status} WHERE id = ${body.id} RETURNING id, status
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Subscriber ${body.id} status set to ${body.status}`,
      severity: "info",
    });
    return Response.json({ updated });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/subscribers",
};
