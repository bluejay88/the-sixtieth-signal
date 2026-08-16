-- Transactional email outbox. Public signups may enqueue approval-required work,
-- but only the service role can claim or complete a delivery.

alter table public.email_queue
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists locked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists email_queue_dispatch_idx
  on public.email_queue(status, approval_required, scheduled_for);

create unique index if not exists email_queue_active_dedupe_idx
  on public.email_queue(contact_id, template_key)
  where status in ('draft','approved','sending');

create or replace function public.enqueue_email(
  target_contact uuid,
  target_template text,
  target_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare queue_id uuid;
begin
  if target_template not in ('waitlist_welcome','reader_access_receipt','loam_archives_welcome') then
    raise exception 'invalid email template';
  end if;

  insert into email_queue(contact_id,template_key,scheduled_for,status,approval_required,payload)
  values(target_contact,target_template,now(),'draft',true,coalesce(target_payload,'{}'::jsonb))
  on conflict(contact_id,template_key) where status in ('draft','approved','sending')
  do update set updated_at=now()
  returning id into queue_id;
  return queue_id;
end
$$;

create or replace function public.join_signal_waitlist(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c_id uuid; queue_id uuid;
begin
  if coalesce(p->>'email','')='' or not coalesce((p->>'email_consent')::boolean,false) then raise exception 'email and consent required'; end if;
  insert into contacts(email,first_name,last_name,preferred_format,discovery_source)
  values(lower(left(trim(p->>'email'),254)),nullif(left(trim(p->>'name'),120),''),null,nullif(left(trim(p->>'format_pref'),40),''),'website_waitlist')
  on conflict(email) do update set first_name=coalesce(excluded.first_name,contacts.first_name),preferred_format=coalesce(excluded.preferred_format,contacts.preferred_format),updated_at=now()
  returning id into c_id;
  insert into consent_events(contact_id,purpose,status,source) values(c_id,'email_marketing','granted','website_waitlist');
  insert into memberships(contact_id,program,tier,status) values(c_id,'newsletter','free','active') on conflict(contact_id,program) do update set status='active';
  queue_id:=enqueue_email(c_id,'waitlist_welcome',jsonb_build_object('preferred_format',nullif(left(trim(p->>'format_pref'),40),'')));
  return jsonb_build_object('stored',true,'email_queued',queue_id is not null,'email_status','awaiting_owner_approval');
end $$;

create or replace function public.claim_approved_email(batch_size integer default 10)
returns table(queue_id uuid, recipient_email text, recipient_name text, template_key text, payload jsonb)
language plpgsql
security definer
set search_path=public
as $$
begin
  return query
  with candidates as (
    select q.id
    from email_queue q
    where q.status='approved'
      and q.approval_required=false
      and q.scheduled_for<=now()
      and q.attempts<3
    order by q.scheduled_for
    for update skip locked
    limit greatest(1,least(batch_size,25))
  ), claimed as (
    update email_queue q
    set status='sending',locked_at=now(),attempts=q.attempts+1,updated_at=now()
    from candidates c
    where q.id=c.id
    returning q.*
  )
  select c.id,contacts.email,trim(concat_ws(' ',contacts.first_name,contacts.last_name)),c.template_key,c.payload
  from claimed c join contacts on contacts.id=c.contact_id;
end
$$;

create or replace function public.complete_email_delivery(
  target_queue_id uuid,
  delivered boolean,
  message_id text default null,
  failure_message text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update email_queue
  set status=case when delivered then 'sent' when attempts>=3 then 'failed' else 'approved' end,
      sent_at=case when delivered then now() else sent_at end,
      provider_message_id=case when delivered then left(message_id,255) else provider_message_id end,
      last_error=case when delivered then null else left(coalesce(failure_message,'provider failure'),500) end,
      locked_at=null,
      updated_at=now()
  where id=target_queue_id and status='sending';
end
$$;

revoke all on function public.enqueue_email(uuid,text,jsonb),public.claim_approved_email(integer),public.complete_email_delivery(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.enqueue_email(uuid,text,jsonb) to service_role;
grant execute on function public.claim_approved_email(integer),public.complete_email_delivery(uuid,boolean,text,text) to service_role;
revoke all on function public.join_signal_waitlist(jsonb) from public,authenticated;
grant execute on function public.join_signal_waitlist(jsonb) to anon;
