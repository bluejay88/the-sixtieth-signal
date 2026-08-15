create extension if not exists pgcrypto;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(), email text not null unique,
  first_name text, last_name text, phone text, country text, address_1 text,
  city text, region text, postal_code text, preferred_format text,
  discovery_source text, interests text[] default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.contacts(id) on delete cascade,
  purpose text not null, status text not null check(status in ('granted','denied','withdrawn')),
  policy_version text not null default '2026-08-15', source text, occurred_at timestamptz not null default now()
);
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  reward text not null check(reward in ('part_one','full_book')), starts_at timestamptz,
  ends_at timestamptz, max_redemptions integer, active boolean not null default true,
  utm_source text, utm_medium text, utm_campaign text, created_at timestamptz not null default now()
);
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(), code text not null unique, campaign_id uuid references public.campaigns(id),
  contact_id uuid not null references public.contacts(id), reward text not null,
  status text not null default 'issued' check(status in ('issued','redeemed','expired','revoked')),
  issued_at timestamptz not null default now(), redeemed_at timestamptz, expires_at timestamptz
);
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.contacts(id),
  program text not null check(program in ('newsletter','loam_archives','discussion')),
  tier text not null default 'free', status text not null default 'active', joined_at timestamptz not null default now(), unique(contact_id,program)
);
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(), contact_id uuid references public.contacts(id),
  template_key text not null, scheduled_for timestamptz not null, status text not null default 'draft',
  approval_required boolean not null default true, sent_at timestamptz, provider_message_id text, created_at timestamptz not null default now()
);
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(), agent_key text not null, task_type text not null,
  status text not null, evidence jsonb not null default '{}', approval_id uuid, started_at timestamptz not null default now(), completed_at timestamptz
);

alter table public.contacts enable row level security;
alter table public.consent_events enable row level security;
alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
alter table public.memberships enable row level security;
alter table public.email_queue enable row level security;
alter table public.agent_runs enable row level security;

insert into public.campaigns(slug,name,reward,active,utm_source,utm_medium,utm_campaign)
values ('reader-launch','Free Reader Launch','full_book',true,'website','coupon','reader_launch')
on conflict(slug) do nothing;

create or replace function public.issue_marketing_coupon(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c_id uuid; campaign uuid; program text;
begin
  if coalesce(p->>'email','')='' or coalesce(p->>'first_name','')='' or coalesce(p->>'last_name','')='' then raise exception 'required profile missing'; end if;
  insert into contacts(email,first_name,last_name,phone,country,address_1,city,region,postal_code,preferred_format,discovery_source,interests)
  values(lower(p->>'email'),p->>'first_name',p->>'last_name',nullif(p->>'phone',''),nullif(p->>'country',''),nullif(p->>'address_1',''),nullif(p->>'city',''),nullif(p->>'region',''),nullif(p->>'postal_code',''),nullif(p->>'preferred_format',''),nullif(p->>'discovery_source',''),coalesce(array(select jsonb_array_elements_text(coalesce(p->'interests','[]'::jsonb))),'{}'))
  on conflict(email) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=coalesce(excluded.phone,contacts.phone),updated_at=now() returning id into c_id;
  insert into consent_events(contact_id,purpose,status,source) values
    (c_id,'delivery','granted',coalesce(p->>'utm_source','website')),
    (c_id,'email_marketing',case when coalesce((p->>'email_marketing_consent')::boolean,false) then 'granted' else 'denied' end,coalesce(p->>'utm_source','website')),
    (c_id,'sms_marketing',case when coalesce((p->>'sms_marketing_consent')::boolean,false) then 'granted' else 'denied' end,coalesce(p->>'utm_source','website'));
  select id into campaign from campaigns where slug='reader-launch';
  insert into coupons(code,campaign_id,contact_id,reward,status,expires_at) values(p->>'code',campaign,c_id,p->>'reward','issued',now()+interval '30 days');
  for program in select jsonb_array_elements_text(coalesce(p->'programs','[]'::jsonb)) loop
    if program in ('newsletter','loam_archives','discussion') then insert into memberships(contact_id,program,tier,status) values(c_id,program,'free','active') on conflict(contact_id,program) do update set status='active'; end if;
  end loop;
  return jsonb_build_object('contact_id',c_id,'stored',true);
end $$;
revoke all on function public.issue_marketing_coupon(jsonb) from public;
grant execute on function public.issue_marketing_coupon(jsonb) to anon,authenticated;
