-- Draft only until owner approves the Supabase portability plan.
-- Operations tables are private by default: RLS enabled, no anon/authenticated grants.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  topic text check (char_length(topic) <= 80),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new','reviewed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  body_md text not null check (char_length(body_md) between 1 and 100000),
  tag text check (char_length(tag) <= 60),
  author text not null default 'editorial-draft',
  status text not null default 'draft' check (status in ('draft','review','live','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status <> 'live' or published_at is not null)
);

create table if not exists public.security_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('auth_failure','rate_limited','spam_blocked','admin_action','anomaly')),
  detail text check (char_length(detail) <= 1000),
  ip_hash text check (char_length(ip_hash) <= 128),
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  created_at timestamptz not null default now()
);

create table if not exists public.signal_engagement (
  id uuid primary key default gen_random_uuid(),
  gate text check (gate is null or gate in ('count','compare','turn','overlay','witness','return')),
  event_type text not null check (event_type in ('page_view','gate_open','coupon_request','archive_interest','store_click','donation_click','sample_start','sample_complete')),
  region text check (char_length(region) <= 80),
  occurred_at timestamptz not null default now()
);

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key check (char_length(bucket_key) <= 200),
  count integer not null default 1 check (count >= 0),
  window_start timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 180),
  message text not null check (char_length(message) between 1 and 8000),
  status text not null default 'open' check (status in ('open','pending','resolved','escalated')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_role text check (char_length(assigned_role) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_role text not null check (char_length(author_role) <= 80),
  message text not null check (char_length(message) between 1 and 8000),
  approval_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete set null,
  product text not null check (product in ('hardcover','paperback','ebook','audiobook','archive_membership','donation')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled')),
  external_ref text unique check (char_length(external_ref) <= 255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audiobook_clips (
  id uuid primary key default gen_random_uuid(),
  chapter_number integer not null check (chapter_number between 1 and 50),
  title text not null check (char_length(title) between 1 and 180),
  narrator text check (char_length(narrator) <= 180),
  audio_url text check (audio_url is null or audio_url ~ '^https://'),
  transcript_url text check (transcript_url is null or transcript_url ~ '^https://'),
  duration_seconds integer check (duration_seconds > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  order_index integer not null default 0,
  qa_approved_at timestamptz,
  status text not null default 'draft' check (status in ('draft','review','live','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'live' or (audio_url is not null and transcript_url is not null and duration_seconds is not null and sha256 is not null and qa_approved_at is not null))
);

create index if not exists feedback_status_created_idx on public.feedback(status,created_at desc);
create index if not exists blog_posts_status_created_idx on public.blog_posts(status,created_at desc);
create index if not exists security_log_created_idx on public.security_log(created_at desc);
create index if not exists signal_engagement_event_time_idx on public.signal_engagement(event_type,occurred_at desc);
create index if not exists support_tickets_status_priority_idx on public.support_tickets(status,priority,created_at desc);
create index if not exists support_replies_ticket_idx on public.support_ticket_replies(ticket_id,created_at);
create index if not exists orders_status_created_idx on public.orders(status,created_at desc);
create index if not exists audiobook_clips_public_idx on public.audiobook_clips(status,order_index);

alter table public.feedback enable row level security;
alter table public.blog_posts enable row level security;
alter table public.security_log enable row level security;
alter table public.signal_engagement enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_replies enable row level security;
alter table public.orders enable row level security;
alter table public.audiobook_clips enable row level security;

revoke all on public.feedback,public.blog_posts,public.security_log,public.signal_engagement,
  public.rate_limit_buckets,public.support_tickets,public.support_ticket_replies,
  public.orders,public.audiobook_clips from anon,authenticated;

create or replace function public.list_live_audiobook_clips()
returns table(chapter_number integer,title text,narrator text,audio_url text,transcript_url text,duration_seconds integer,sha256 text,order_index integer)
language sql
stable
security definer
set search_path = public
as $$
  select c.chapter_number,c.title,c.narrator,c.audio_url,c.transcript_url,c.duration_seconds,c.sha256,c.order_index
  from public.audiobook_clips c
  where c.status='live'
  order by c.order_index,c.chapter_number;
$$;

revoke all on function public.list_live_audiobook_clips() from public,authenticated;
grant execute on function public.list_live_audiobook_clips() to anon;
