create or replace function public.join_signal_waitlist(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c_id uuid;
begin
  if coalesce(p->>'email','')='' or not coalesce((p->>'email_consent')::boolean,false) then raise exception 'email and consent required'; end if;
  insert into contacts(email,first_name,last_name,preferred_format,discovery_source)
  values(lower(left(trim(p->>'email'),254)),nullif(left(trim(p->>'name'),120),''),null,nullif(left(trim(p->>'format_pref'),40),''),'website_waitlist')
  on conflict(email) do update set first_name=coalesce(excluded.first_name,contacts.first_name),preferred_format=coalesce(excluded.preferred_format,contacts.preferred_format),updated_at=now()
  returning id into c_id;
  insert into consent_events(contact_id,purpose,status,source) values(c_id,'email_marketing','granted','website_waitlist');
  insert into memberships(contact_id,program,tier,status) values(c_id,'newsletter','free','active') on conflict(contact_id,program) do update set status='active';
  return jsonb_build_object('stored',true);
end $$;

create or replace function public.submit_signal_feedback(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c_id uuid; msg text;
begin
  msg:=trim(coalesce(p->>'message',''));
  if msg='' or char_length(msg)>4000 then raise exception 'invalid message'; end if;
  if coalesce(p->>'email','')<>'' then
    insert into contacts(email,discovery_source) values(lower(left(trim(p->>'email'),254)),'website_feedback')
    on conflict(email) do update set updated_at=now() returning id into c_id;
  end if;
  insert into feedback(contact_id,topic,message) values(c_id,nullif(left(trim(p->>'topic'),80),''),msg);
  return jsonb_build_object('stored',true);
end $$;

create or replace function public.track_signal_event(p jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare kind text:=p->>'event_type'; gate_name text:=p->>'gate';
begin
  if kind not in ('page_view','gate_open','archive_interest','store_click','donation_click','sample_start','sample_complete') then raise exception 'invalid event'; end if;
  if gate_name is not null and gate_name not in ('count','compare','turn','overlay','witness','return') then raise exception 'invalid gate'; end if;
  insert into signal_engagement(gate,event_type) values(gate_name,kind);
  return jsonb_build_object('stored',true);
end $$;

create or replace function public.get_public_signal_stats()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'waitlist_total',(select count(*) from memberships where program='newsletter' and status='active'),
    'signal_positions_confirmed',(select count(distinct gate) from signal_engagement where gate is not null),
    'signal_positions_total',360
  );
$$;

revoke all on function public.join_signal_waitlist(jsonb),public.submit_signal_feedback(jsonb),public.track_signal_event(jsonb),public.get_public_signal_stats() from public,authenticated;
grant execute on function public.join_signal_waitlist(jsonb),public.submit_signal_feedback(jsonb),public.track_signal_event(jsonb),public.get_public_signal_stats() to anon;
