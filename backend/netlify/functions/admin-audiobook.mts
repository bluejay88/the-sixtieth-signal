import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";
import { logSecurityEvent } from "../../lib/security.mts";

/**
 * Audiobook clip management. Agents (a "Content" or "Production" role) can
 * add chapter samples here as they're produced; nothing appears on the
 * public site until status is flipped to 'live'.
 */
export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();

  if (req.method === "GET") {
    const rows = await db.sql`SELECT * FROM audiobook_clips ORDER BY order_index ASC, created_at ASC`;
    return Response.json({ clips: rows });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.chapter_label || !body?.title) {
      return Response.json({ error: "chapter_label and title are required" }, { status: 400 });
    }
    const [created] = await db.sql`
      INSERT INTO audiobook_clips (chapter_label, title, narrator, audio_url, duration_seconds, order_index, status)
      VALUES (
        ${body.chapter_label}, ${body.title}, ${body.narrator ?? null}, ${body.audio_url ?? null},
        ${body.duration_seconds ?? null}, ${body.order_index ?? 0}, ${body.status ?? "draft"}
      )
      RETURNING *
    `;
    await logSecurityEvent({ event_type: "admin_action", detail: `Audiobook clip created: ${body.title}` });
    return Response.json({ created });
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => null);
    if (!body?.id) return Response.json({ error: "id is required" }, { status: 400 });
    const [updated] = await db.sql`
      UPDATE audiobook_clips SET
        chapter_label = COALESCE(${body.chapter_label}, chapter_label),
        title = COALESCE(${body.title}, title),
        narrator = COALESCE(${body.narrator}, narrator),
        audio_url = COALESCE(${body.audio_url}, audio_url),
        duration_seconds = COALESCE(${body.duration_seconds}, duration_seconds),
        order_index = COALESCE(${body.order_index}, order_index),
        status = COALESCE(${body.status}, status),
        updated_at = now()
      WHERE id = ${body.id}
      RETURNING *
    `;
    await logSecurityEvent({
      event_type: "admin_action",
      detail: `Audiobook clip ${body.id} updated (status=${body.status ?? "unchanged"})`,
      severity: body.status === "live" ? "warning" : "info",
    });
    return Response.json({ updated });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await db.sql`DELETE FROM audiobook_clips WHERE id = ${id}`;
    return Response.json({ deleted: id });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/admin/audiobook",
};
