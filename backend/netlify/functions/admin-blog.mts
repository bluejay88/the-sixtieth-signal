import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

/**
 * Content queue for site "dispatches." Any agent with the admin key can
 * draft a post here (status defaults to "draft"), but nothing reaches the
 * public site until a human or a designated review step flips it to "live" —
 * this endpoint intentionally does not auto-publish.
 */
export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();

  if (req.method === "GET") {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const rows = status
      ? await db.sql`SELECT * FROM blog_posts WHERE status = ${status} ORDER BY created_at DESC`
      : await db.sql`SELECT * FROM blog_posts ORDER BY created_at DESC`;
    return Response.json({ posts: rows });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.title || !body?.body_md) {
      return Response.json({ error: "title and body_md are required" }, { status: 400 });
    }
    const [created] = await db.sql`
      INSERT INTO blog_posts (title, body_md, tag, author, status)
      VALUES (${body.title}, ${body.body_md}, ${body.tag ?? null}, ${body.author ?? "ai-agent"}, 'draft')
      RETURNING *
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Draft created: "${body.title}" by ${body.author ?? "ai-agent"}`,
      severity: "info",
    });
    return Response.json({ created });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id || !body?.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }
    const allowed = ["draft", "review", "live", "rejected"];
    if (!allowed.includes(body.status)) {
      return Response.json({ error: `status must be one of ${allowed.join(", ")}` }, { status: 400 });
    }
    const publishedAt = body.status === "live" ? new Date().toISOString() : null;
    const [updated] = await db.sql`
      UPDATE blog_posts
      SET status = ${body.status}, updated_at = now(),
          published_at = COALESCE(${publishedAt}, published_at)
      WHERE id = ${body.id}
      RETURNING *
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Post ${body.id} status set to ${body.status}`,
      severity: body.status === "live" ? "warning" : "info",
    });
    return Response.json({ updated });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/blog",
};
