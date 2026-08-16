import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { corsHeadersFor, getClientIp, hashIp, isRateLimited } from "../../lib/security.mts";

/**
 * The ONLY public read endpoint. Returns nothing but rounded, aggregate
 * counts — no emails, no names, no per-record data — so the site's
 * waitlist counter and Gate-progress counter can show real numbers
 * instead of invented ones, without exposing anything private.
 */
export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersFor(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors });

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  if (await isRateLimited(`stats:${ipHash}`, 30, 60)) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: cors });
  }

  const db = getDatabase();

  const [subs] = await db.sql`SELECT COUNT(*) AS total FROM subscribers`;
  const [gateOpens] = await db.sql`
    SELECT COUNT(DISTINCT gate) AS distinct_gates
    FROM signal_engagement WHERE event_type = 'gate_open' AND gate IS NOT NULL
  `;
  const [totalGateEvents] = await db.sql`
    SELECT COUNT(*) AS total FROM signal_engagement WHERE event_type = 'gate_open'
  `;

  return Response.json(
    {
      waitlist_total: Number(subs.total),
      // Signal positions confirmed is community-driven and reader-submitted
      // via The Circle in later phases; until that's live this reflects
      // gate-open engagement events only, capped at the true max of 360.
      signal_positions_confirmed: Math.min(Number(totalGateEvents.total), 360),
      signal_positions_total: 360,
    },
    { headers: { ...cors, "cache-control": "public, max-age=30" } }
  );
};

export const config: Config = {
  path: "/api/public/stats",
};
