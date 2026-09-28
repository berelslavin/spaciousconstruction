CREATE TABLE public.operator_machines (
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_id, machine_id)
);
GRANT ALL ON public.operator_machines TO service_role;
ALTER TABLE public.operator_machines ENABLE ROW LEVEL SECURITY;

-- Keep today's crew working: existing operators get every current active machine.
INSERT INTO public.operator_machines(operator_id, machine_id)
SELECT o.id, m.id FROM public.operators o CROSS JOIN public.machines m WHERE m.active;

CREATE OR REPLACE FUNCTION public.operator_can_use(p_operator_id uuid, p_machine_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM operator_machines WHERE operator_id=p_operator_id AND machine_id=p_machine_id)
$$;

CREATE OR REPLACE FUNCTION public.operator_machine_access()
RETURNS TABLE(operator text, machine_code text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.name, m.code FROM operator_machines om JOIN operators o ON o.id=om.operator_id JOIN machines m ON m.id=om.machine_id
  WHERE o.active AND m.active ORDER BY 1,2
$$;

CREATE OR REPLACE FUNCTION public.admin_set_operator_machines(p_pin text, p_operator_id uuid, p_machine_codes text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  IF NOT EXISTS (SELECT 1 FROM operators WHERE id=p_operator_id) THEN RAISE EXCEPTION 'Operator not found'; END IF;
  IF EXISTS (SELECT 1 FROM machines WHERE current_operator_id=p_operator_id AND NOT (code = ANY(coalesce(p_machine_codes,'{}')))) THEN
    RAISE EXCEPTION 'This operator currently has a machine you are removing. Return or transfer it first.';
  END IF;
  DELETE FROM operator_machines WHERE operator_id=p_operator_id;
  INSERT INTO operator_machines(operator_id, machine_id)
  SELECT p_operator_id, id FROM machines WHERE code = ANY(coalesce(p_machine_codes,'{}'));
  RETURN jsonb_build_object('ok',true);
END $$;

REVOKE ALL ON FUNCTION public.operator_can_use(uuid,uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.operator_machine_access() FROM public;
GRANT EXECUTE ON FUNCTION public.operator_machine_access() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_operator_machines(text,uuid,text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_operator_machines(text,uuid,text[]) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.checkout_machine(p_machine_code text, p_operator_name text, p_task_location text, p_safe_confirmed boolean, p_fuel_level text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF NOT public.operator_can_use(v_op.id, v_m.id) THEN RAISE EXCEPTION '% is not authorized for this machine', v_op.name; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.create_transfer_authorization(p_machine_code text, p_new_operator_name text, p_authorized_by text, p_note text DEFAULT NULL::text, p_pin text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF NOT public.operator_can_use(v_to.id, v_m.id) THEN RAISE EXCEPTION '% is not authorized for this machine', v_to.name; END IF;
  v_code := 'TA-'||to_char(now() at time zone 'America/Chicago','YYYYMMDD-HH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  INSERT INTO transfer_authorizations(machine_id,from_operator_id,to_operator_id,code,authorized_by,note,valid_date)
  VALUES(v_m.id,v_from.id,v_to.id,v_code,trim(p_authorized_by),nullif(trim(p_note),''),v_today) RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok',true,'authorization_id',v_id,'code',v_code,'machine',p_machine_code,'from_operator',v_from.name,'to_operator',v_to.name,'valid_date',v_today);
END $function$;

CREATE OR REPLACE FUNCTION public.transfer_machine(p_machine_code text, p_current_operator_name text, p_new_operator_name text, p_task_location text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF NOT public.operator_can_use(v_to.id, v_m.id) THEN RAISE EXCEPTION '% is not authorized for this machine', v_to.name; END IF;
  SELECT * INTO v_auth FROM transfer_authorizations WHERE machine_id=v_m.id AND from_operator_id=v_from.id AND to_operator_id=v_to.id
    AND used_at IS NULL AND valid_date=(now() at time zone 'America/Chicago')::date ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No valid transfer authorization for today. Admin approval is required.'; END IF;
  UPDATE transfer_authorizations SET used_at=now() WHERE id=v_auth.id;
  INSERT INTO activities(machine_id,type,from_operator_id,to_operator_id,task_location,authorization_id)
  VALUES(v_m.id,'transfer',v_from.id,v_to.id,trim(p_task_location),v_auth.id) RETURNING id INTO v_id;
  UPDATE machines SET current_operator_id=v_to.id,current_task_location=trim(p_task_location),last_activity_at=now(),last_activity_type='transfer' WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_new_operator_name);
END $function$;