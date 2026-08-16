import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 500);
    const rows = await db.sql`
      SELECT id, email, topic, message, status, created_at
      FROM feedback ORDER BY created_at DESC LIMIT ${limit}
    `;
    return Response.json({ feedback: rows });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id || !body?.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const [updated] = await db.sql`
      UPDATE feedback SET status = ${body.status} WHERE id = ${body.id} RETURNING id, status
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Feedback ${body.id} status set to ${body.status}`,
      severity: "info",
    });
    return Response.json({ updated });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/feedback",
};
