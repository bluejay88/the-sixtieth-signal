-- The Sixtieth Signal — backend schema
-- Owner/developer-only data store. Nothing in this schema is ever exposed
-- directly to site visitors; all access goes through authenticated admin
-- functions or narrow, write-only public functions.

CREATE TABLE IF NOT EXISTS subscribers (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  email         TEXT NOT NULL UNIQUE,
  format_pref   TEXT,
  age_range     TEXT,
  region        TEXT,
  source        TEXT DEFAULT 'website',   -- website | lead_magnet_chapter1 | referral | podcast | etc.
  referral_code TEXT UNIQUE,              -- this subscriber's own shareable code
  referred_by   TEXT,                     -- referral_code of whoever sent them, if any
  status        TEXT NOT NULL DEFAULT 'waitlist', -- waitlist | circle_member | unsubscribed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback (
  id            SERIAL PRIMARY KEY,
  email         TEXT,
  topic         TEXT,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'new', -- new | reviewed | archived
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  body_md       TEXT NOT NULL,
  tag           TEXT,                       -- research note | craft note | community digest
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | review | live | rejected
  author        TEXT NOT NULL DEFAULT 'ai-agent',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS security_log (
  id            SERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL,   -- auth_failure | rate_limited | spam_blocked | admin_action | anomaly
  detail        TEXT,
  ip_hash       TEXT,            -- salted hash only; raw IPs are never stored
  severity      TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signal_engagement (
  id            SERIAL PRIMARY KEY,
  gate          TEXT,            -- count | compare | turn | overlay | witness | return | null
  event_type    TEXT NOT NULL,   -- page_view | gate_open | waitlist_join | circle_request
  region        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key    TEXT PRIMARY KEY,   -- e.g. 'waitlist:' || ip_hash
  count         INTEGER NOT NULL DEFAULT 1,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON subscribers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_security_log_created_at ON security_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_engagement_created_at ON signal_engagement (created_at DESC);

-- Customer service
CREATE TABLE IF NOT EXISTS support_tickets (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',   -- open | pending | resolved | escalated
  priority      TEXT NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
  assigned_agent TEXT,                          -- which AI agent / role owns this
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id            SERIAL PRIMARY KEY,
  ticket_id     INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author        TEXT NOT NULL,   -- 'customer' | agent name/role, e.g. 'customer-success-agent'
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Book sales / orders ledger (agent-managed; a future Stripe webhook can also write here)
CREATE TABLE IF NOT EXISTS orders (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  product       TEXT NOT NULL,   -- hardcover | paperback | ebook | audiobook
  amount_cents  INTEGER NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'usd',
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | paid | refunded | cancelled
  external_ref  TEXT,            -- e.g. Stripe payment intent id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_ticket_replies (ticket_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- Audiobook clips (metadata + an external audio URL you host — Netlify
-- Blobs, S3, your audiobook distributor's CDN, etc. This table doesn't
-- store audio bytes itself, just what the public site should show).
CREATE TABLE IF NOT EXISTS audiobook_clips (
  id            SERIAL PRIMARY KEY,
  chapter_label TEXT NOT NULL,       -- e.g. "Chapter One"
  title         TEXT NOT NULL,       -- e.g. "The Hunger Map"
  narrator      TEXT,
  audio_url     TEXT,                -- hosted mp3/m4a URL; null until you upload one
  duration_seconds INTEGER,
  order_index   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | live
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audiobook_clips_status ON audiobook_clips (status, order_index);
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_code ON subscribers (referral_code);
