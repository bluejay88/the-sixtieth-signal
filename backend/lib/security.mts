import { getDatabase } from "@netlify/database";

/**
 * Raw IPs are never stored. We hash them (salted with a server-only secret)
 * so abuse patterns can still be tracked and rate-limited without keeping
 * anything that identifies a real visitor at rest.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = Netlify.env.get("IP_HASH_SALT");
  if (!salt) throw new Error("IP_HASH_SALT is not configured");
  const data = new TextEncoder().encode(salt + ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function logSecurityEvent(entry: {
  event_type: string;
  detail?: string;
  ip_hash?: string;
  severity?: "info" | "warning" | "critical";
}): Promise<void> {
  try {
    const db = getDatabase();
    await db.sql`
      INSERT INTO security_log (event_type, detail, ip_hash, severity)
      VALUES (${entry.event_type}, ${entry.detail ?? null}, ${entry.ip_hash ?? null}, ${entry.severity ?? "info"})
    `;
  } catch {
    // Never let logging failures break the request itself.
  }
}

/**
 * Simple fixed-window rate limiter backed by the database, so it holds up
 * across cold starts and multiple function instances (unlike an in-memory
 * counter). Returns true if the request should be BLOCKED.
 */
export async function isRateLimited(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const db = getDatabase();
  const now = new Date();

  const [row] = await db.sql`
    SELECT count, window_start FROM rate_limit_buckets WHERE bucket_key = ${bucket}
  `;

  if (!row) {
    await db.sql`
      INSERT INTO rate_limit_buckets (bucket_key, count, window_start)
      VALUES (${bucket}, 1, ${now.toISOString()})
      ON CONFLICT (bucket_key) DO UPDATE SET count = 1, window_start = ${now.toISOString()}
    `;
    return false;
  }

  const windowStart = new Date(row.window_start);
  const elapsedSeconds = (now.getTime() - windowStart.getTime()) / 1000;

  if (elapsedSeconds > windowSeconds) {
    await db.sql`
      UPDATE rate_limit_buckets SET count = 1, window_start = ${now.toISOString()}
      WHERE bucket_key = ${bucket}
    `;
    return false;
  }

  if (row.count >= limit) {
    return true;
  }

  await db.sql`
    UPDATE rate_limit_buckets SET count = count + 1 WHERE bucket_key = ${bucket}
  `;
  return false;
}

/** Narrow, explicit CORS allowlist — only for the public write endpoints
 * that the marketing site itself needs to call cross-origin. Admin routes
 * never get CORS headers; they're for server-to-server / agent use only. */
export function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowed = (Netlify.env.get("ALLOWED_PUBLIC_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (origin && allowed.includes(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
  }
  return {};
}
