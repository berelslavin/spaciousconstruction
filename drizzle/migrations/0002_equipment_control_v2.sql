
-- ===== Columns =====
alter table public.machines add column if not exists custody_since timestamptz;
update public.machines m set custody_since = coalesce(
  (select max(a.created_at) from public.activities a where a.machine_id=m.id and a.type='checkout'), m.last_activity_at, now())
where m.current_operator_id is not null and m.custody_since is null;

alter table public.transfer_authorizations add column if not exists valid_date date;
update public.transfer_authorizations set valid_date=(created_at at time zone 'America/Chicago')::date where valid_date is null;
alter table public.transfer_authorizations alter column valid_date set default ((now() at time zone 'America/Chicago')::date);
alter table public.transfer_authorizations alter column valid_date set not null;

-- ===== Helpers =====
create or replace function public.eq_cutoff() returns time language sql stable security definer set search_path=public as $$
  select coalesce((select eod_cutoff from app_settings where id=1),'17:00'::time) $$;

create or replace function public.eod_required_date(p_now timestamptz default now()) returns date
language sql stable security definer set search_path=public as $$
  select case when (p_now at time zone 'America/Chicago')::time >= public.eq_cutoff()
    then (p_now at time zone 'America/Chicago')::date
    else (p_now at time zone 'America/Chicago')::date - 1 end $$;

create or replace function public.eod_missing(p_last_eod date, p_in_custody boolean, p_custody_since timestamptz,
  p_machine_created timestamptz, p_now timestamptz default now()) returns boolean
language sql stable security definer set search_path=public as $$
  with r as (select public.eod_required_date(p_now) d, public.eq_cutoff() c,
                    (p_now at time zone 'America/Chicago') l)
  select case
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

create or replace function public._eq_require_pin(p_pin text) returns void
language plpgsql stable security definer set search_path=public as $$
begin
  if p_pin is null or not exists (select 1 from app_settings where id=1 and admin_pin=p_pin) then
    raise exception 'Invalid admin PIN';
  end if;
end $$;
revoke execute on function public._eq_require_pin(text) from public, anon, authenticated;

-- ===== Dashboard view =====
drop view if exists public.machine_dashboard;
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
  m.do_not_operate
from machines m left join operators o on o.id=m.current_operator_id
where m.active=true;
grant select on public.machine_dashboard to anon, authenticated;
grant all on public.machine_dashboard to service_role;

-- ===== Lock down sensitive tables =====
drop policy if exists "machines readable" on public.machines;
drop policy if exists "activities readable" on public.activities;
drop policy if exists "issues readable" on public.issues;
revoke all on public.machines, public.activities, public.issues, public.transfer_authorizations, public.app_settings from anon, authenticated;
revoke all on public.app_settings_public from anon, authenticated;
revoke insert, update, delete on public.operators from anon, authenticated;

-- ===== Worker RPCs =====
drop function if exists public.transfer_machine(text,text,text,text,boolean);
drop function if exists public.report_machine_issue(text,text,text,text,boolean);
drop function if exists public.return_machine(text,text,text,text,text);
drop function if exists public.clear_machine_issue(text,text,text,text);

create or replace function public.checkout_machine(p_machine_code text, p_operator_name text, p_task_location text,
  p_safe_confirmed boolean, p_fuel_level text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_op operators%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_id uuid;
begin
  if p_safe_confirmed is distinct from true then raise exception 'Safety confirmation is required'; end if;
  if nullif(trim(p_task_location),'') is null then raise exception 'Task/location is required'; end if;
  select * into v_m from machines where code=p_machine_code and active=true for update;
  if not found then raise exception 'Machine not found'; end if;
  if v_m.do_not_operate then raise exception 'DO NOT OPERATE - this machine has an open issue'; end if;
  if v_m.current_operator_id is not null then raise exception 'Machine is already checked out. Use Transfer machine.'; end if;
  if public.eod_missing(v_m.last_eod_date, false, null, v_m.created_at) then
    raise exception 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  end if;
  select * into v_op from operators where name=p_operator_name and active=true;
  if not found then raise exception 'Operator is not authorized'; end if;
  if v_m.fuel_logged_date is distinct from v_today and p_fuel_level is null then raise exception 'Fuel level is required today'; end if;
  if p_fuel_level is not null and p_fuel_level not in ('Full','¾','½','¼','Needs Fuel') then raise exception 'Invalid fuel level'; end if;
  insert into activities(machine_id,type,operator_id,task_location,fuel_level,safe_option_confirmed)
  values(v_m.id,'checkout',v_op.id,trim(p_task_location),
         case when v_m.fuel_logged_date is distinct from v_today then p_fuel_level end, true)
  returning id into v_id;
  update machines set current_operator_id=v_op.id, current_task_location=trim(p_task_location), custody_since=now(),
    fuel_level=case when fuel_logged_date is distinct from v_today and p_fuel_level is not null then p_fuel_level else fuel_level end,
    fuel_logged_date=case when fuel_logged_date is distinct from v_today and p_fuel_level is not null then v_today else fuel_logged_date end,
    last_activity_at=now(), last_activity_type='checkout'
  where id=v_m.id;
  return jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_operator_name);
end $$;

create or replace function public.get_transfer_destinations(p_machine_code text) returns table(to_operator text)
language sql stable security definer set search_path=public as $$
  select distinct t.name from transfer_authorizations a
  join machines m on m.id=a.machine_id
  join operators t on t.id=a.to_operator_id
  where m.code=p_machine_code and m.active and not m.do_not_operate
    and a.from_operator_id=m.current_operator_id and a.used_at is null
    and a.valid_date=(now() at time zone 'America/Chicago')::date and t.active
  order by 1 $$;

create or replace function public.transfer_machine(p_machine_code text, p_current_operator_name text,
  p_new_operator_name text, p_task_location text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_from operators%rowtype; v_to operators%rowtype; v_auth transfer_authorizations%rowtype; v_id uuid;
begin
  if nullif(trim(p_task_location),'') is null then raise exception 'Task/location is required'; end if;
  select * into v_m from machines where code=p_machine_code and active=true for update;
  if not found then raise exception 'Machine not found'; end if;
  if v_m.do_not_operate then raise exception 'DO NOT OPERATE - this machine cannot be transferred'; end if;
  if v_m.current_operator_id is null then raise exception 'Machine is not currently checked out'; end if;
  select * into v_from from operators where name=p_current_operator_name and active=true;
  if not found or v_from.id<>v_m.current_operator_id then raise exception 'Current responsible operator does not match live custody'; end if;
  select * into v_to from operators where name=p_new_operator_name and active=true;
  if not found then raise exception 'New operator is not authorized'; end if;
  if v_to.id=v_from.id then raise exception 'New operator must be different'; end if;
  select * into v_auth from transfer_authorizations
   where machine_id=v_m.id and from_operator_id=v_from.id and to_operator_id=v_to.id and used_at is null
     and valid_date=(now() at time zone 'America/Chicago')::date
   order by created_at desc limit 1 for update;
  if not found then raise exception 'No valid transfer authorization for today. Admin approval is required.'; end if;
  update transfer_authorizations set used_at=now() where id=v_auth.id;
  insert into activities(machine_id,type,from_operator_id,to_operator_id,task_location,authorization_id)
  values(v_m.id,'transfer',v_from.id,v_to.id,trim(p_task_location),v_auth.id) returning id into v_id;
  update machines set current_operator_id=v_to.id, current_task_location=trim(p_task_location),
    last_activity_at=now(), last_activity_type='transfer' where id=v_m.id;
  return jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_new_operator_name);
end $$;

create or replace function public.return_machine(p_machine_code text, p_operator_name text, p_photo_url text,
  p_parked_confirmed boolean, p_fuel_level text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_op operators%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_id uuid;
begin
  if p_parked_confirmed is distinct from true then raise exception 'Confirm the machine is parked at its designated return location'; end if;
  if nullif(trim(p_photo_url),'') is null then raise exception 'A clear return photo is required'; end if;
  select * into v_m from machines where code=p_machine_code and active=true for update;
  if not found then raise exception 'Machine not found'; end if;
  select * into v_op from operators where name=p_operator_name and active=true;
  if not found then raise exception 'Operator is not authorized'; end if;
  if v_m.current_operator_id is not null and v_m.current_operator_id<>v_op.id then
    raise exception 'Only the current responsible operator can return this machine'; end if;
  if v_m.fuel_logged_date is distinct from v_today and p_fuel_level is null then raise exception 'Fuel level is required today'; end if;
  if p_fuel_level is not null and p_fuel_level not in ('Full','¾','½','¼','Needs Fuel') then raise exception 'Invalid fuel level'; end if;
  insert into activities(machine_id,type,operator_id,task_location,fuel_level,photo_url,note)
  values(v_m.id,'return',v_op.id,v_m.return_location,
         case when v_m.fuel_logged_date is distinct from v_today then p_fuel_level end, p_photo_url, nullif(trim(p_note),''))
  returning id into v_id;
  update machines set current_operator_id=null, current_task_location=null, custody_since=null,
    fuel_level=case when fuel_logged_date is distinct from v_today and p_fuel_level is not null then p_fuel_level else fuel_level end,
    fuel_logged_date=case when fuel_logged_date is distinct from v_today and p_fuel_level is not null then v_today else fuel_logged_date end,
    last_activity_at=now(), last_activity_type='return', last_return_photo_url=p_photo_url, last_eod_date=v_today
  where id=v_m.id;
  return jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'returned_to',v_m.return_location,'eod_date',v_today);
end $$;

create or replace function public.report_machine_issue(p_machine_code text, p_reporter_name text, p_description text, p_photo_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_r operators%rowtype; v_issue uuid; v_id uuid;
begin
  if nullif(trim(p_description),'') is null then raise exception 'Issue description is required'; end if;
  if nullif(trim(p_photo_url),'') is null then raise exception 'Issue photo is required'; end if;
  select * into v_m from machines where code=p_machine_code and active=true for update;
  if not found then raise exception 'Machine not found'; end if;
  select * into v_r from operators where name=p_reporter_name and active=true;
  if not found then raise exception 'Reporter is not authorized'; end if;
  insert into issues(machine_id,reporter_id,description,photo_url,status)
  values(v_m.id,v_r.id,trim(p_description),p_photo_url,'open') returning id into v_issue;
  insert into activities(machine_id,type,operator_id,photo_url,note,do_not_operate_confirmed)
  values(v_m.id,'issue',v_r.id,p_photo_url,trim(p_description),true) returning id into v_id;
  update machines set do_not_operate=true, last_activity_at=now(), last_activity_type='issue' where id=v_m.id;
  return jsonb_build_object('ok',true,'issue_id',v_issue,'activity_id',v_id,'machine',p_machine_code);
end $$;

-- ===== Admin RPCs =====
create or replace function public.create_transfer_authorization(p_machine_code text, p_new_operator_name text,
  p_authorized_by text, p_note text default null, p_pin text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_from operators%rowtype; v_to operators%rowtype; v_id uuid; v_code text;
  v_today date := (now() at time zone 'America/Chicago')::date;
begin
  perform public._eq_require_pin(p_pin);
  if nullif(trim(p_authorized_by),'') is null then raise exception 'Authorized by is required'; end if;
  select * into v_m from machines where code=p_machine_code and active=true for update;
  if not found then raise exception 'Machine not found'; end if;
  if v_m.do_not_operate then raise exception 'Machine is Do Not Operate and cannot be transferred'; end if;
  if v_m.current_operator_id is null then raise exception 'Machine is not currently in custody'; end if;
  select * into v_from from operators where id=v_m.current_operator_id;
  select * into v_to from operators where name=p_new_operator_name and active=true;
  if not found then raise exception 'New operator is not authorized'; end if;
  if v_to.id=v_from.id then raise exception 'New operator must be different'; end if;
  v_code := 'TA-' || to_char(now() at time zone 'America/Chicago','YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into transfer_authorizations(machine_id,from_operator_id,to_operator_id,code,authorized_by,note,valid_date)
  values(v_m.id,v_from.id,v_to.id,v_code,trim(p_authorized_by),nullif(trim(p_note),''),v_today) returning id into v_id;
  return jsonb_build_object('ok',true,'authorization_id',v_id,'code',v_code,'machine',p_machine_code,
    'from_operator',v_from.name,'to_operator',v_to.name,'valid_date',v_today);
end $$;

create or replace function public.clear_machine_issues(p_pin text, p_issue_ids uuid[], p_cleared_by text, p_clear_note text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_mid uuid; v_count int; v_left int; v_code text;
begin
  perform public._eq_require_pin(p_pin);
  if nullif(trim(p_cleared_by),'') is null then raise exception 'Cleared by is required'; end if;
  if nullif(trim(p_clear_note),'') is null then raise exception 'Clearance note is required'; end if;
  if p_issue_ids is null or array_length(p_issue_ids,1) is null then raise exception 'Choose at least one issue'; end if;
  select distinct machine_id into v_mid from issues where id = any(p_issue_ids) and status='open';
  if v_mid is null then raise exception 'No open issue found'; end if;
  if (select count(distinct machine_id) from issues where id=any(p_issue_ids)) > 1 then raise exception 'Clear issues one machine at a time'; end if;
  perform 1 from machines where id=v_mid for update;
  update issues set status='cleared', cleared_by=trim(p_cleared_by), cleared_at=now(), clear_note=trim(p_clear_note)
   where id=any(p_issue_ids) and status='open';
  get diagnostics v_count = row_count;
  select count(*) into v_left from issues where machine_id=v_mid and status='open';
  insert into activities(machine_id,type,note) values(v_mid,'clear','Cleared by '||trim(p_cleared_by)||': '||trim(p_clear_note));
  if v_left=0 then update machines set do_not_operate=false, last_activity_at=now(), last_activity_type='clear' where id=v_mid;
  else update machines set last_activity_at=now(), last_activity_type='clear' where id=v_mid; end if;
  select code into v_code from machines where id=v_mid;
  return jsonb_build_object('ok',true,'machine',v_code,'issues_cleared',v_count,'open_remaining',v_left,'back_in_service',v_left=0);
end $$;

create or replace function public.admin_settings(p_pin text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return (select jsonb_build_object('sheets_connected',sheets_connected,'sheets_url',sheets_url,'eod_cutoff',eod_cutoff) from app_settings where id=1);
end $$;

create or replace function public.admin_activity(p_pin text, p_machine_code text default null, p_type text default null, p_today_only boolean default false)
returns table(id uuid, created_at timestamptz, machine_code text, machine_name text, type text, operator text,
  from_operator text, to_operator text, task_location text, fuel_level text, note text, photo_url text)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query select a.id, a.created_at, m.code, m.name, a.type, o.name, f.name, t.name, a.task_location, a.fuel_level, a.note, a.photo_url
  from activities a join machines m on m.id=a.machine_id
  left join operators o on o.id=a.operator_id left join operators f on f.id=a.from_operator_id left join operators t on t.id=a.to_operator_id
  where (nullif(p_machine_code,'') is null or m.code=p_machine_code)
    and (nullif(p_type,'') is null or a.type=p_type)
    and (not coalesce(p_today_only,false) or (a.created_at at time zone 'America/Chicago')::date=(now() at time zone 'America/Chicago')::date)
  order by a.created_at desc limit 500;
end $$;

create or replace function public.admin_issues(p_pin text)
returns table(id uuid, machine_code text, machine_name text, reporter text, description text, photo_url text,
  status text, created_at timestamptz, cleared_by text, cleared_at timestamptz, clear_note text)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query select i.id, m.code, m.name, o.name, i.description, i.photo_url, i.status, i.created_at, i.cleared_by, i.cleared_at, i.clear_note
  from issues i join machines m on m.id=i.machine_id left join operators o on o.id=i.reporter_id
  order by (i.status='open') desc, coalesce(i.cleared_at,i.created_at) desc limit 150;
end $$;

create or replace function public.admin_authorizations(p_pin text)
returns table(id uuid, code text, machine_code text, from_operator text, to_operator text, authorized_by text,
  note text, valid_date date, used_at timestamptz, created_at timestamptz, state text)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query select a.id, a.code, m.code, f.name, t.name, a.authorized_by, a.note, a.valid_date, a.used_at, a.created_at,
    case when a.used_at is not null then 'used'
         when a.valid_date < (now() at time zone 'America/Chicago')::date then 'expired'
         when m.current_operator_id is distinct from a.from_operator_id or m.do_not_operate then 'void'
         else 'valid' end
  from transfer_authorizations a join machines m on m.id=a.machine_id
  join operators f on f.id=a.from_operator_id join operators t on t.id=a.to_operator_id
  order by a.created_at desc limit 100;
end $$;

create or replace function public.admin_machines(p_pin text)
returns table(id uuid, code text, name text, return_location text, active boolean, do_not_operate boolean, responsible_operator text)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query select m.id, m.code, m.name, m.return_location, m.active, m.do_not_operate, o.name
  from machines m left join operators o on o.id=m.current_operator_id order by m.active desc, m.code;
end $$;

create or replace function public.admin_save_machine(p_pin text, p_id uuid, p_code text, p_name text, p_return_location text, p_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_m machines%rowtype; v_code text := upper(trim(coalesce(p_code,''))); v_id uuid;
begin
  perform public._eq_require_pin(p_pin);
  if v_code='' then raise exception 'Machine code is required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Machine name is required'; end if;
  if nullif(trim(p_return_location),'') is null then raise exception 'Return location is required'; end if;
  if exists (select 1 from machines where upper(code)=v_code and id is distinct from p_id) then
    raise exception 'Machine code % is already used', v_code; end if;
  if p_id is null then
    insert into machines(code,name,return_location,active) values(v_code,trim(p_name),trim(p_return_location),coalesce(p_active,true)) returning id into v_id;
  else
    select * into v_m from machines where id=p_id for update;
    if not found then raise exception 'Machine not found'; end if;
    if coalesce(p_active,true)=false and v_m.current_operator_id is not null then
      raise exception 'Machine is checked out. Return it before deactivating.'; end if;
    update machines set code=v_code, name=trim(p_name), return_location=trim(p_return_location), active=coalesce(p_active,true) where id=p_id;
    v_id := p_id;
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'code',v_code);
end $$;

create or replace function public.admin_operators(p_pin text)
returns table(id uuid, name text, active boolean, custody_count int)
language plpgsql stable security definer set search_path=public as $$
begin perform public._eq_require_pin(p_pin);
  return query select o.id, o.name, o.active, (select count(*)::int from machines m where m.current_operator_id=o.id)
  from operators o order by o.active desc, o.name;
end $$;

create or replace function public.admin_save_operator(p_pin text, p_id uuid, p_name text, p_active boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_name text := regexp_replace(trim(coalesce(p_name,'')),'\s+',' ','g'); v_id uuid;
begin
  perform public._eq_require_pin(p_pin);
  if v_name='' then raise exception 'Operator name is required'; end if;
  if exists (select 1 from operators where lower(name)=lower(v_name) and id is distinct from p_id) then
    raise exception 'An operator named % already exists', v_name; end if;
  if p_id is null then
    insert into operators(name,active) values(v_name,coalesce(p_active,true)) returning id into v_id;
  else
    if not exists (select 1 from operators where id=p_id) then raise exception 'Operator not found'; end if;
    if coalesce(p_active,true)=false and exists (select 1 from machines where current_operator_id=p_id) then
      raise exception 'This operator has custody of a machine. Return or transfer it first.'; end if;
    update operators set name=v_name, active=coalesce(p_active,true) where id=p_id;
    v_id := p_id;
  end if;
  return jsonb_build_object('ok',true,'id',v_id,'name',v_name);
end $$;

grant execute on function public.checkout_machine(text,text,text,boolean,text), public.get_transfer_destinations(text),
  public.transfer_machine(text,text,text,text), public.return_machine(text,text,text,boolean,text,text),
  public.report_machine_issue(text,text,text,text), public.create_transfer_authorization(text,text,text,text,text),
  public.clear_machine_issues(text,uuid[],text,text), public.admin_settings(text),
  public.admin_activity(text,text,text,boolean), public.admin_issues(text), public.admin_authorizations(text),
  public.admin_machines(text), public.admin_save_machine(text,uuid,text,text,text,boolean),
  public.admin_operators(text), public.admin_save_operator(text,uuid,text,boolean), public.verify_admin_pin(text)
  to anon, authenticated;
