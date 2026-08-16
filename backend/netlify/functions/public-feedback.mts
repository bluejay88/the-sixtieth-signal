import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { corsHeadersFor, getClientIp, hashIp, isRateLimited, logSecurityEvent } from "../../lib/security.mts";

export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersFor(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  if (await isRateLimited(`feedback:${ipHash}`, 8, 3600)) {
    await logSecurityEvent({ event_type: "rate_limited", detail: "feedback submit", ip_hash: ipHash, severity: "warning" });
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429, headers: cors });
  }

  const body = await req.json().catch(() => null);
  if (!body?.message) {
    return Response.json({ error: "message is required" }, { status: 400, headers: cors });
  }
  if (body.company_website) {
    await logSecurityEvent({ event_type: "spam_blocked", detail: "feedback honeypot triggered", ip_hash: ipHash });
    return Response.json({ ok: true }, { headers: cors });
  }
  if (String(body.message).length > 5000) {
    return Response.json({ error: "message too long" }, { status: 400, headers: cors });
  }

  const db = getDatabase();
  await db.sql`
    INSERT INTO feedback (email, topic, message) VALUES (${body.email ?? null}, ${body.topic ?? null}, ${body.message})
  `;

  return Response.json({ ok: true }, { headers: cors });
};

export const config: Config = {
  path: "/api/public/feedback",
};
