import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { corsHeadersFor, getClientIp, hashIp, isRateLimited } from "../../lib/security.mts";

/**
 * Minimal, anonymous engagement tracking (gate opens, waitlist/circle CTA
 * clicks) that feeds the real backend demographics — no cookies, no
 * fingerprinting, no PII. Region is optional and self-reported by the
 * client if it wants to send one; nothing is inferred from IP beyond the
 * rate-limit hash.
 */
export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersFor(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  if (await isRateLimited(`track:${ipHash}`, 60, 60)) {
    return Response.json({ ok: false }, { status: 429, headers: cors });
  }

  const body = await req.json().catch(() => null);
  const allowedEvents = ["page_view", "gate_open", "waitlist_join", "circle_request"];
  if (!body?.event_type || !allowedEvents.includes(body.event_type)) {
    return Response.json({ error: "invalid event_type" }, { status: 400, headers: cors });
  }

  const db = getDatabase();
  await db.sql`
    INSERT INTO signal_engagement (gate, event_type, region)
    VALUES (${body.gate ?? null}, ${body.event_type}, ${body.region ?? null})
  `;

  return Response.json({ ok: true }, { headers: cors });
};

export const config: Config = {
  path: "/api/public/track",
};
