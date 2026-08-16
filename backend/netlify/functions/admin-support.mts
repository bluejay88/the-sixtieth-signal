import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

/**
 * Customer service queue. Designed for an AI "Customer Success" agent to
 * read open tickets, post replies, and change status/priority — the same
 * surface a human support rep would use, but API-first.
 */
export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const ticketId = url.searchParams.get("ticket_id");
    if (ticketId) {
      const [ticket] = await db.sql`SELECT * FROM support_tickets WHERE id = ${ticketId}`;
      const replies = await db.sql`
        SELECT * FROM support_ticket_replies WHERE ticket_id = ${ticketId} ORDER BY created_at ASC
      `;
      return Response.json({ ticket, replies });
    }
    const status = url.searchParams.get("status");
    const tickets = status
      ? await db.sql`SELECT * FROM support_tickets WHERE status = ${status} ORDER BY created_at DESC`
      : await db.sql`SELECT * FROM support_tickets ORDER BY created_at DESC`;
    return Response.json({ tickets });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    // Two POST shapes: create a new ticket, or add a reply to an existing one.
    if (body?.ticket_id && body?.message) {
      const [reply] = await db.sql`
        INSERT INTO support_ticket_replies (ticket_id, author, message)
        VALUES (${body.ticket_id}, ${body.author ?? "customer-success-agent"}, ${body.message})
        RETURNING *
      `;
      await db.sql`UPDATE support_tickets SET updated_at = now() WHERE id = ${body.ticket_id}`;
      await logSecurityEvent({
        event_type: "admin_action",
        detail: `Reply added to ticket ${body.ticket_id} by ${body.author ?? "customer-success-agent"}`,
      });
      return Response.json({ reply });
    }
    if (body?.email && body?.subject && body?.message) {
      const [ticket] = await db.sql`
        INSERT INTO support_tickets (email, subject, message, priority)
        VALUES (${body.email}, ${body.subject}, ${body.message}, ${body.priority ?? "normal"})
        RETURNING *
      `;
      return Response.json({ ticket });
    }
    return Response.json({ error: "provide (email, subject, message) to open a ticket, or (ticket_id, message) to reply" }, { status: 400 });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id) return Response.json({ error: "id is required" }, { status: 400 });
    const [updated] = await db.sql`
      UPDATE support_tickets
      SET status = COALESCE(${body.status}, status),
          priority = COALESCE(${body.priority}, priority),
          assigned_agent = COALESCE(${body.assigned_agent}, assigned_agent),
          updated_at = now()
      WHERE id = ${body.id}
      RETURNING *
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Ticket ${body.id} updated (status=${body.status ?? "unchanged"})`,
      severity: body.status === "escalated" ? "warning" : "info",
    });
    return Response.json({ updated });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/support",
};
