-- Rain day switch (pauses EOD + fuel dues), repeat-offender counts, photo policy fix for numeric machine codes

alter table public.app_settings add column if not exists rain_day date;

-- eod_missing: no end-of-day is expected on a declared rain day
create or replace function public.eod_missing(p_last_eod date, p_in_custody boolean, p_custody_since timestamptz,
  p_machine_created timestamptz, p_now timestamptz default now()) returns boolean
language sql stable security definer set search_path=public as $$
  with r as (select public.eod_required_date(p_now) d, public.eq_cutoff() c,
                    (p_now at time zone 'America/Chicago') l,
                    (select rain_day from app_settings where id=1) rain)
  select case
    when r.rain is not null and r.rain = r.l::date then false
    when p_in_custody and r.l::time >= r.c then true
    when p_in_custody and p_custody_since is not null
         and (p_custody_since at time zone 'America/Chicago')::date < r.l::date then true
    when p_in_custody and p_custody_since is not null
         and p_custody_since < ((r.d + r.c) at time zone 'America/Chicago') then true
    when p_machine_created >= ((r.d + r.c) at time zone 'America/Chicago') then false
    when p_last_eod is null then true
    when p_last_eod < r.d then true
    else false end
  from r $$;

-- dashboard: expose rain_today + custody_since (who's-got-what board, fuel prompt pausing)
drop view if exists public.machine_dashboard cascade;
create view public.machine_dashboard with (security_invoker=false) as
select m.id, m.code, m.name, m.return_location,
  case when m.do_not_operate then 'Do Not Operate'
       when public.eod_missing(m.last_eod_date, m.current_operator_id is not null, m.custody_since, m.created_at) then 'Missing End-of-Day Confirmation'
       when m.current_operator_id is not null then 'Checked Out'
       else 'Available' end as status,
  o.name as responsible_operator, m.current_task_location, m.last_activity_at, m.fuel_level, m.fuel_logged_date,
  m.last_return_photo_url, m.last_eod_date,
  (select i.description from issues i where i.machine_id=m.id and i.status='open' order by i.created_at desc limit 1) as open_issue,
  coalesce(m.fuel_level='Needs Fuel', false) as needs_fuel,
  m.last_activity_type,
  (m.fuel_logged_date is not distinct from (now() at time zone 'America/Chicago')::date) as fuel_logged_today,
  public.eod_missing(m.last_eod_date, m.current_operator_id is not null, m.custody_since, m.created_at) as eod_missing,
  public.eod_required_date() as required_eod_date,
  (select count(*)::int from issues i where i.machine_id=m.id and i.status='open') as open_issue_count,
  m.do_not_operate,
  m.custody_since,
  ((select rain_day from app_settings where id=1) = (now() at time zone 'America/Chicago')::date) as rain_today
from machines m left join operators o on o.id=m.current_operator_id
where m.active=true;
grant select on public.machine_dashboard to anon, authenticated;
grant all on public.machine_dashboard to service_role;

-- recreate the photo upload policy dropped by CASCADE; also allow numeric asset-number codes
create policy "field app can upload equipment photos" on storage.objects
for insert to anon, authenticated
with check (
  bucket_id = 'equipment-photos'
  and objects.name ~ '^[A-Z0-9-]+/[0-9]{13}-[a-z0-9]{1,8}\.jpg$'
  and exists (select 1 from public.machine_dashboard m where m.code = split_part(objects.name, '/', 1))
);

-- admin settings: include rain day state
create or replace function public.admin_settings(p_pin text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return (select jsonb_build_object('sheets_connected',sheets_connected,'sheets_url',sheets_url,'eod_cutoff',eod_cutoff,
    'rain_day',rain_day,'rain_today',(rain_day = (now() at time zone 'America/Chicago')::date)) from app_settings where id=1);
end $$;

-- admin: toggle rain day for today (Chicago)
create or replace function public.admin_set_rain_day(p_pin text, p_on boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  update app_settings
  set rain_day = case when p_on then (now() at time zone 'America/Chicago')::date else null end,
      updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true, 'rain_today', p_on);
end $$;

-- repeat offenders: current missing-EOD machines + past admin force-returns, per operator
create or replace function public.admin_eod_offenders(p_pin text)
returns table(operator text, missed integer)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query
  select o.name, (
    (select count(*) from machines m where m.current_operator_id = o.id and m.active
       and public.eod_missing(m.last_eod_date, true, m.custody_since, m.created_at))
    + (select count(*) from activities a where a.operator_id = o.id and a.type = 'force_return')
  )::int
  from operators o
  where o.active
  order by 2 desc, 1;
end $$;

grant execute on function public.admin_set_rain_day(text, boolean) to anon, authenticated;
grant execute on function public.admin_eod_offenders(text) to anon, authenticated;