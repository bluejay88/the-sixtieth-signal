-- Prevent program membership from being activated without matching consent.

create or replace function public.issue_marketing_coupon(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_id uuid;
  campaign_id_value uuid;
  requested_program text;
  requested_reward text;
  email_consent boolean;
begin
  if coalesce(p->>'email','') = ''
     or coalesce(p->>'first_name','') = ''
     or coalesce(p->>'last_name','') = ''
     or not coalesce((p->>'delivery_consent')::boolean, false) then
    raise exception 'required profile or delivery consent missing';
  end if;

  requested_reward := p->>'reward';
  if requested_reward not in ('part_one','full_book') then
    raise exception 'invalid reward';
  end if;
  email_consent := coalesce((p->>'email_marketing_consent')::boolean,false);

  insert into contacts(email,first_name,last_name,phone,country,address_1,city,region,postal_code,preferred_format,discovery_source,interests)
  values(lower(trim(p->>'email')),left(trim(p->>'first_name'),120),left(trim(p->>'last_name'),120),nullif(left(trim(p->>'phone'),32),''),nullif(left(trim(p->>'country'),80),''),nullif(left(trim(p->>'address_1'),180),''),nullif(left(trim(p->>'city'),100),''),nullif(left(trim(p->>'region'),100),''),nullif(left(trim(p->>'postal_code'),24),''),nullif(left(trim(p->>'preferred_format'),40),''),nullif(left(trim(p->>'discovery_source'),80),''),coalesce(array(select left(jsonb_array_elements_text(coalesce(p->'interests','[]'::jsonb)),60)),'{}'))
  on conflict(email) do update set first_name=excluded.first_name,last_name=excluded.last_name,phone=coalesce(excluded.phone,contacts.phone),updated_at=now()
  returning id into c_id;

  insert into consent_events(contact_id,purpose,status,source) values
    (c_id,'delivery','granted',coalesce(left(p->>'utm_source',80),'website')),
    (c_id,'email_marketing',case when email_consent then 'granted' else 'denied' end,coalesce(left(p->>'utm_source',80),'website')),
    (c_id,'sms_marketing',case when coalesce((p->>'sms_marketing_consent')::boolean,false) and coalesce(p->>'phone','')<>'' then 'granted' else 'denied' end,coalesce(left(p->>'utm_source',80),'website'));

  select id into campaign_id_value from campaigns where slug='reader-launch' and active is true;
  if campaign_id_value is null then raise exception 'campaign unavailable'; end if;
  insert into coupons(code,campaign_id,contact_id,reward,status,expires_at)
  values(left(p->>'code',64),campaign_id_value,c_id,requested_reward,'issued',now()+interval '30 days');

  for requested_program in select jsonb_array_elements_text(coalesce(p->'programs','[]'::jsonb)) loop
    if requested_program in ('newsletter','loam_archives','discussion') and email_consent then
      insert into memberships(contact_id,program,tier,status)
      values(c_id,requested_program,'free','active')
      on conflict(contact_id,program) do update set status='active';
    end if;
  end loop;

  return jsonb_build_object('contact_id',c_id,'stored',true);
end
$$;

revoke all on function public.issue_marketing_coupon(jsonb) from public,authenticated;
grant execute on function public.issue_marketing_coupon(jsonb) to anon;
