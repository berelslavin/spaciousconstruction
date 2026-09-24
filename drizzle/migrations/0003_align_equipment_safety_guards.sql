CREATE OR REPLACE FUNCTION public.checkout_machine(p_machine_code text, p_operator_name text, p_task_location text,
  p_safe_confirmed boolean, p_fuel_level text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_m machines%rowtype; v_op operators%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_id uuid;
BEGIN
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'DO NOT OPERATE - this machine has an open issue'; END IF;
  IF public.eod_missing(v_m.last_eod_date, v_m.current_operator_id IS NOT NULL, v_m.custody_since, v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  END IF;
  IF v_m.current_operator_id IS NOT NULL THEN RAISE EXCEPTION 'Machine is already checked out. Use Transfer machine.'; END IF;
  IF p_safe_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Safety confirmation is required'; END IF;
  IF nullif(trim(p_task_location),'') IS NULL THEN RAISE EXCEPTION 'Task/location is required'; END IF;
  SELECT * INTO v_op FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator is not authorized'; END IF;
  IF v_m.fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NULL THEN RAISE EXCEPTION 'Fuel level is required today'; END IF;
  IF p_fuel_level IS NOT NULL AND p_fuel_level NOT IN ('Full','¾','½','¼','Needs Fuel') THEN RAISE EXCEPTION 'Invalid fuel level'; END IF;
  INSERT INTO activities(machine_id,type,operator_id,task_location,fuel_level,safe_option_confirmed)
  VALUES(v_m.id,'checkout',v_op.id,trim(p_task_location),CASE WHEN v_m.fuel_logged_date IS DISTINCT FROM v_today THEN p_fuel_level END,true)
  RETURNING id INTO v_id;
  UPDATE machines SET current_operator_id=v_op.id,current_task_location=trim(p_task_location),custody_since=now(),
    fuel_level=CASE WHEN fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NOT NULL THEN p_fuel_level ELSE fuel_level END,
    fuel_logged_date=CASE WHEN fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NOT NULL THEN v_today ELSE fuel_logged_date END,
    last_activity_at=now(),last_activity_type='checkout' WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_operator_name);
END $$;

CREATE OR REPLACE FUNCTION public.get_transfer_destinations(p_machine_code text) RETURNS TABLE(to_operator text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT DISTINCT t.name FROM transfer_authorizations a
  JOIN machines m ON m.id=a.machine_id JOIN operators t ON t.id=a.to_operator_id
  WHERE m.code=p_machine_code AND m.active AND NOT m.do_not_operate
    AND NOT public.eod_missing(m.last_eod_date,m.current_operator_id IS NOT NULL,m.custody_since,m.created_at)
    AND a.from_operator_id=m.current_operator_id AND a.used_at IS NULL
    AND a.valid_date=(now() at time zone 'America/Chicago')::date AND t.active ORDER BY 1 $$;

CREATE OR REPLACE FUNCTION public.transfer_machine(p_machine_code text,p_current_operator_name text,p_new_operator_name text,p_task_location text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_m machines%rowtype; v_from operators%rowtype; v_to operators%rowtype; v_auth transfer_authorizations%rowtype; v_id uuid;
BEGIN
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'DO NOT OPERATE - this machine cannot be transferred'; END IF;
  IF public.eod_missing(v_m.last_eod_date,v_m.current_operator_id IS NOT NULL,v_m.custody_since,v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  END IF;
  IF v_m.current_operator_id IS NULL THEN RAISE EXCEPTION 'Machine is not currently checked out'; END IF;
  IF nullif(trim(p_task_location),'') IS NULL THEN RAISE EXCEPTION 'Task/location is required'; END IF;
  SELECT * INTO v_from FROM operators WHERE name=p_current_operator_name AND active=true;
  IF NOT FOUND OR v_from.id<>v_m.current_operator_id THEN RAISE EXCEPTION 'Current responsible operator does not match live custody'; END IF;
  SELECT * INTO v_to FROM operators WHERE name=p_new_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'New operator is not authorized'; END IF;
  IF v_to.id=v_from.id THEN RAISE EXCEPTION 'New operator must be different'; END IF;
  SELECT * INTO v_auth FROM transfer_authorizations WHERE machine_id=v_m.id AND from_operator_id=v_from.id AND to_operator_id=v_to.id
    AND used_at IS NULL AND valid_date=(now() at time zone 'America/Chicago')::date ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No valid transfer authorization for today. Admin approval is required.'; END IF;
  UPDATE transfer_authorizations SET used_at=now() WHERE id=v_auth.id;
  INSERT INTO activities(machine_id,type,from_operator_id,to_operator_id,task_location,authorization_id)
  VALUES(v_m.id,'transfer',v_from.id,v_to.id,trim(p_task_location),v_auth.id) RETURNING id INTO v_id;
  UPDATE machines SET current_operator_id=v_to.id,current_task_location=trim(p_task_location),last_activity_at=now(),last_activity_type='transfer' WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_new_operator_name);
END $$;

CREATE OR REPLACE FUNCTION public.return_machine(p_machine_code text,p_operator_name text,p_photo_url text,p_parked_confirmed boolean,p_fuel_level text DEFAULT NULL,p_note text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_m machines%rowtype; v_op operators%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_required date := public.eod_required_date(); v_id uuid;
BEGIN
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.current_operator_id IS NULL AND NOT public.eod_missing(v_m.last_eod_date,false,NULL,v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day is already complete for %', v_required;
  END IF;
  IF p_parked_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Confirm the machine is parked at its designated return location'; END IF;
  IF nullif(trim(p_photo_url),'') IS NULL THEN RAISE EXCEPTION 'A clear return photo is required'; END IF;
  SELECT * INTO v_op FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator is not authorized'; END IF;
  IF v_m.current_operator_id IS NOT NULL AND v_m.current_operator_id<>v_op.id THEN RAISE EXCEPTION 'Only the current responsible operator can return this machine'; END IF;
  IF v_m.fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NULL THEN RAISE EXCEPTION 'Fuel level is required today'; END IF;
  IF p_fuel_level IS NOT NULL AND p_fuel_level NOT IN ('Full','¾','½','¼','Needs Fuel') THEN RAISE EXCEPTION 'Invalid fuel level'; END IF;
  INSERT INTO activities(machine_id,type,operator_id,task_location,fuel_level,photo_url,note)
  VALUES(v_m.id,'return',v_op.id,v_m.return_location,CASE WHEN v_m.fuel_logged_date IS DISTINCT FROM v_today THEN p_fuel_level END,p_photo_url,nullif(trim(p_note),'')) RETURNING id INTO v_id;
  UPDATE machines SET current_operator_id=NULL,current_task_location=NULL,custody_since=NULL,
    fuel_level=CASE WHEN fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NOT NULL THEN p_fuel_level ELSE fuel_level END,
    fuel_logged_date=CASE WHEN fuel_logged_date IS DISTINCT FROM v_today AND p_fuel_level IS NOT NULL THEN v_today ELSE fuel_logged_date END,
    last_activity_at=now(),last_activity_type='return',last_return_photo_url=p_photo_url,last_eod_date=v_today WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'returned_to',v_m.return_location,'eod_date',v_today);
END $$;

CREATE OR REPLACE FUNCTION public.create_transfer_authorization(p_machine_code text,p_new_operator_name text,p_authorized_by text,p_note text DEFAULT NULL,p_pin text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_m machines%rowtype; v_from operators%rowtype; v_to operators%rowtype; v_id uuid; v_code text; v_today date := (now() at time zone 'America/Chicago')::date;
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'Machine is Do Not Operate. Clear all open issues first.'; END IF;
  IF public.eod_missing(v_m.last_eod_date,v_m.current_operator_id IS NOT NULL,v_m.custody_since,v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day is missing. Return / end-of-day is required before authorizing transfer.';
  END IF;
  IF v_m.current_operator_id IS NULL THEN RAISE EXCEPTION 'Machine is not currently in custody'; END IF;
  IF nullif(trim(p_authorized_by),'') IS NULL THEN RAISE EXCEPTION 'Authorized by is required'; END IF;
  SELECT * INTO v_from FROM operators WHERE id=v_m.current_operator_id;
  SELECT * INTO v_to FROM operators WHERE name=p_new_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'New operator is not authorized'; END IF;
  IF v_to.id=v_from.id THEN RAISE EXCEPTION 'New operator must be different'; END IF;
  v_code := 'TA-'||to_char(now() at time zone 'America/Chicago','YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  INSERT INTO transfer_authorizations(machine_id,from_operator_id,to_operator_id,code,authorized_by,note,valid_date)
  VALUES(v_m.id,v_from.id,v_to.id,v_code,trim(p_authorized_by),nullif(trim(p_note),''),v_today) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'authorization_id',v_id,'code',v_code,'machine',p_machine_code,'from_operator',v_from.name,'to_operator',v_to.name,'valid_date',v_today);
END $$;

CREATE OR REPLACE FUNCTION public.admin_authorizations(p_pin text)
RETURNS TABLE(id uuid,code text,machine_code text,from_operator text,to_operator text,authorized_by text,note text,valid_date date,used_at timestamptz,created_at timestamptz,state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._eq_require_pin(p_pin);
  RETURN QUERY SELECT a.id,a.code,m.code,f.name,t.name,a.authorized_by,a.note,a.valid_date,a.used_at,a.created_at,
    CASE WHEN a.used_at IS NOT NULL THEN 'used' WHEN a.valid_date < (now() at time zone 'America/Chicago')::date THEN 'expired'
      WHEN m.current_operator_id IS DISTINCT FROM a.from_operator_id OR m.do_not_operate
        OR public.eod_missing(m.last_eod_date,m.current_operator_id IS NOT NULL,m.custody_since,m.created_at) THEN 'void' ELSE 'valid' END
  FROM transfer_authorizations a JOIN machines m ON m.id=a.machine_id JOIN operators f ON f.id=a.from_operator_id JOIN operators t ON t.id=a.to_operator_id
  ORDER BY a.created_at DESC LIMIT 100;
END $$;

DROP FUNCTION IF EXISTS public.admin_machines(text);
CREATE FUNCTION public.admin_machines(p_pin text)
RETURNS TABLE(id uuid,code text,name text,return_location text,active boolean,do_not_operate boolean,responsible_operator text,eod_missing boolean,open_issue_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._eq_require_pin(p_pin);
  RETURN QUERY SELECT m.id,m.code,m.name,m.return_location,m.active,m.do_not_operate,o.name,
    public.eod_missing(m.last_eod_date,m.current_operator_id IS NOT NULL,m.custody_since,m.created_at),
    (SELECT count(*)::int FROM issues i WHERE i.machine_id=m.id AND i.status='open')
  FROM machines m LEFT JOIN operators o ON o.id=m.current_operator_id ORDER BY m.active DESC,m.code;
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_machine(p_pin text,p_id uuid,p_code text,p_name text,p_return_location text,p_active boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_m machines%rowtype; v_code text := upper(trim(coalesce(p_code,''))); v_id uuid; v_open int;
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  IF v_code='' THEN RAISE EXCEPTION 'Machine code is required'; END IF;
  IF nullif(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'Machine name is required'; END IF;
  IF nullif(trim(p_return_location),'') IS NULL THEN RAISE EXCEPTION 'Return location is required'; END IF;
  IF EXISTS (SELECT 1 FROM machines WHERE upper(code)=v_code AND id IS DISTINCT FROM p_id) THEN RAISE EXCEPTION 'Machine code % is already used',v_code; END IF;
  IF p_id IS NULL THEN
    INSERT INTO machines(code,name,return_location,active) VALUES(v_code,trim(p_name),trim(p_return_location),coalesce(p_active,true)) RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_m FROM machines WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
    SELECT count(*) INTO v_open FROM issues WHERE machine_id=p_id AND status='open';
    IF coalesce(p_active,true)=false AND v_m.active=true THEN
      IF v_m.current_operator_id IS NOT NULL THEN RAISE EXCEPTION 'Machine is in custody. Return it before deactivating.'; END IF;
      IF v_m.do_not_operate OR v_open>0 THEN RAISE EXCEPTION 'Machine has unresolved safety issues. Clear all issues before deactivating.'; END IF;
      IF public.eod_missing(v_m.last_eod_date,false,NULL,v_m.created_at) THEN RAISE EXCEPTION 'Machine is missing end-of-day. Complete Return / end-of-day before deactivating.'; END IF;
    END IF;
    UPDATE machines SET code=v_code,name=trim(p_name),return_location=trim(p_return_location),active=coalesce(p_active,true) WHERE id=p_id; v_id:=p_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'id',v_id,'code',v_code);
END $$;

CREATE OR REPLACE FUNCTION public.admin_save_operator(p_pin text,p_id uuid,p_name text,p_active boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text := regexp_replace(trim(coalesce(p_name,'')),'\s+',' ','g'); v_id uuid;
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  IF v_name='' THEN RAISE EXCEPTION 'Operator name is required'; END IF;
  IF EXISTS (SELECT 1 FROM operators WHERE lower(name)=lower(v_name) AND id IS DISTINCT FROM p_id) THEN RAISE EXCEPTION 'An operator named % already exists',v_name; END IF;
  IF p_id IS NULL THEN INSERT INTO operators(name,active) VALUES(v_name,coalesce(p_active,true)) RETURNING id INTO v_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM operators WHERE id=p_id) THEN RAISE EXCEPTION 'Operator not found'; END IF;
    IF coalesce(p_active,true)=false THEN
      IF EXISTS (SELECT 1 FROM machines WHERE current_operator_id=p_id) THEN RAISE EXCEPTION 'This operator has custody of a machine. Return or transfer it first.'; END IF;
      IF EXISTS (SELECT 1 FROM transfer_authorizations WHERE to_operator_id=p_id AND used_at IS NULL AND valid_date=(now() at time zone 'America/Chicago')::date)
        THEN RAISE EXCEPTION 'This operator has an unused transfer authorization today. Wait for it to expire or complete the transfer first.'; END IF;
    END IF;
    UPDATE operators SET name=v_name,active=coalesce(p_active,true) WHERE id=p_id; v_id:=p_id;
  END IF;
  RETURN jsonb_build_object('ok',true,'id',v_id,'name',v_name);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_machines(text) TO anon, authenticated;