import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { corsHeadersFor } from "../../lib/security.mts";

/**
 * Public, read-only, and scoped to status='live' only — this is the single
 * exception to "no public listing," because clip titles/durations aren't
 * sensitive and this is what lets the site show real chapter samples
 * instead of a hardcoded placeholder.
 */
export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersFor(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });

  const db = getDatabase();
  const rows = await db.sql`
    SELECT chapter_label, title, narrator, audio_url, duration_seconds, order_index
    FROM audiobook_clips WHERE status = 'live'
    ORDER BY order_index ASC, created_at ASC
  `;

  return Response.json({ clips: rows }, { headers: { ...cors, "cache-control": "public, max-age=120" } });
};

export const config: Config = {
  path: "/api/public/audiobook-clips",
};
