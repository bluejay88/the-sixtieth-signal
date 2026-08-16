import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();

  const [subscriberTotals] = await db.sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'waitlist') AS waitlist,
      COUNT(*) FILTER (WHERE status = 'circle_member') AS circle_members,
      COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS new_last_7d
    FROM subscribers
  `;

  const [feedbackTotals] = await db.sql`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'new') AS unreviewed
    FROM feedback
  `;

  const [blogTotals] = await db.sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'draft') AS draft,
      COUNT(*) FILTER (WHERE status = 'review') AS review,
      COUNT(*) FILTER (WHERE status = 'live') AS live
    FROM blog_posts
  `;

  const gateOpens = await db.sql`
    SELECT gate, COUNT(*) AS opens
    FROM signal_engagement
    WHERE event_type = 'gate_open' AND gate IS NOT NULL
    GROUP BY gate
    ORDER BY opens DESC
  `;

  const [securityTotals] = await db.sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') AS events_last_24h,
      COUNT(*) FILTER (WHERE severity = 'critical' AND created_at > now() - interval '7 days') AS critical_last_7d
    FROM security_log
  `;

  return Response.json({
    subscribers: subscriberTotals,
    feedback: feedbackTotals,
    blog_queue: blogTotals,
    gate_engagement: gateOpens,
    security: securityTotals,
    generated_at: new Date().toISOString(),
  });
};

export const config: Config = {
  path: "/api/admin/overview",
};
