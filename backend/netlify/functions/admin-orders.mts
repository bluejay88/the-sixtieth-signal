import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

/**
 * Book sales ledger. Until a payment processor is wired in, agents (or a
 * human) can record orders here directly; once Stripe/etc. is connected,
 * point its webhook at a new function that writes to this same table.
 */
export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();
  const url = new URL(req.url);

  if (req.method === "GET") {
    const status = url.searchParams.get("status");
    const orders = status
      ? await db.sql`SELECT * FROM orders WHERE status = ${status} ORDER BY created_at DESC`
      : await db.sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 500`;

    const [summary] = await db.sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_orders,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'paid'), 0) AS gross_revenue_cents,
        COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_orders,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_orders
      FROM orders
    `;

    const byProduct = await db.sql`
      SELECT product, COUNT(*) AS units, COALESCE(SUM(amount_cents),0) AS revenue_cents
      FROM orders WHERE status = 'paid'
      GROUP BY product ORDER BY units DESC
    `;

    return Response.json({ orders, summary, by_product: byProduct });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.product) {
      return Response.json({ error: "email and product are required" }, { status: 400 });
    }
    const [created] = await db.sql`
      INSERT INTO orders (email, product, amount_cents, currency, status, external_ref)
      VALUES (${body.email}, ${body.product}, ${body.amount_cents ?? 0}, ${body.currency ?? "usd"}, ${body.status ?? "pending"}, ${body.external_ref ?? null})
      RETURNING *
    `;
    return Response.json({ created });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id || !body?.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const [updated] = await db.sql`
      UPDATE orders SET status = ${body.status}, updated_at = now() WHERE id = ${body.id} RETURNING *
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Order ${body.id} status set to ${body.status}`,
      severity: body.status === "refunded" ? "warning" : "info",
    });
    return Response.json({ updated });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/orders",
};
