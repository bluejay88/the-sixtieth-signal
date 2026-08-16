import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();

  const byAge = await db.sql`
    SELECT COALESCE(age_range, 'unknown') AS age_range, COUNT(*) AS count
    FROM subscribers
    GROUP BY age_range
    ORDER BY count DESC
  `;

  const byRegion = await db.sql`
    SELECT COALESCE(region, 'unknown') AS region, COUNT(*) AS count
    FROM subscribers
    GROUP BY region
    ORDER BY count DESC
  `;

  const byFormat = await db.sql`
    SELECT COALESCE(format_pref, 'unknown') AS format_pref, COUNT(*) AS count
    FROM subscribers
    GROUP BY format_pref
    ORDER BY count DESC
  `;

  const bySource = await db.sql`
    SELECT COALESCE(source, 'unknown') AS source, COUNT(*) AS count
    FROM subscribers
    GROUP BY source
    ORDER BY count DESC
  `;

  const signupTrend = await db.sql`
    SELECT date_trunc('day', created_at) AS day, COUNT(*) AS signups
    FROM subscribers
    WHERE created_at > now() - interval '30 days'
    GROUP BY day
    ORDER BY day ASC
  `;

  return Response.json({
    age_range: byAge,
    region: byRegion,
    format_preference: byFormat,
    source: bySource,
    signup_trend_30d: signupTrend,
    generated_at: new Date().toISOString(),
  });
};

export const config: Config = {
  path: "/api/admin/demographics",
};
