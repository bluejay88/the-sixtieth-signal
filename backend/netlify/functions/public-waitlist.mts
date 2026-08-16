import type { Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { corsHeadersFor, getClientIp, hashIp, isRateLimited, logSecurityEvent } from "../../lib/security.mts";

/**
 * Public, write-only. No listing, no auth needed to submit — but it is
 * rate-limited per IP and rejects obvious bot submissions (honeypot field).
 * This is the only way subscriber data enters the backend from the site.
 */
export default async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeadersFor(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);

  if (await isRateLimited(`waitlist:${ipHash}`, 5, 3600)) {
    await logSecurityEvent({ event_type: "rate_limited", detail: "waitlist submit", ip_hash: ipHash, severity: "warning" });
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429, headers: cors });
  }

  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return Response.json({ error: "email is required" }, { status: 400, headers: cors });
  }
  // Honeypot: a hidden field real users never fill in.
  if (body.company_website) {
    await logSecurityEvent({ event_type: "spam_blocked", detail: "waitlist honeypot triggered", ip_hash: ipHash, severity: "info" });
    return Response.json({ ok: true }, { headers: cors }); // pretend success, don't tip off bots
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email) || email.length > 254) {
    return Response.json({ error: "invalid email" }, { status: 400, headers: cors });
  }

  const db = getDatabase();
  const myReferralCode = generateReferralCode();
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "website";
  const referredBy = typeof body.referred_by === "string" && body.referred_by.trim() ? body.referred_by.trim() : null;

  try {
    const [row] = await db.sql`
      INSERT INTO subscribers (name, email, format_pref, age_range, region, source, referral_code, referred_by)
      VALUES (${bounded(body.name, 120)}, ${email}, ${bounded(body.format_pref, 40)}, ${bounded(body.age_range, 30)}, ${bounded(body.region, 80)}, ${source.slice(0, 80)}, ${myReferralCode}, ${referredBy?.slice(0, 32) ?? null})
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, subscribers.name),
        format_pref = COALESCE(EXCLUDED.format_pref, subscribers.format_pref),
        age_range = COALESCE(EXCLUDED.age_range, subscribers.age_range)
      RETURNING referral_code
    `;
    await db.sql`INSERT INTO signal_engagement (event_type, region) VALUES ('waitlist_join', ${body.region ?? null})`;
    return Response.json({ ok: true, referral_code: row.referral_code }, { headers: cors });
  } catch (err) {
    await logSecurityEvent({ event_type: "anomaly", detail: `waitlist insert failed: ${String(err)}`, severity: "critical" });
    return Response.json({ error: "internal_error" }, { status: 500, headers: cors });
  }
};

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 7; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function bounded(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

export const config: Config = {
  path: "/api/public/waitlist",
};
