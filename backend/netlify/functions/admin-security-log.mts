import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { requireAdmin } from "../../lib/auth.mts";

export default async (req: Request) => {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const db = getDatabase();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 1000);
  const severity = url.searchParams.get("severity");

  const rows = severity
    ? await db.sql`SELECT * FROM security_log WHERE severity = ${severity} ORDER BY created_at DESC LIMIT ${limit}`
    : await db.sql`SELECT * FROM security_log ORDER BY created_at DESC LIMIT ${limit}`;

  return Response.json({ events: rows });
};

export const config: Config = {
  path: "/api/admin/security-log",
};
