CREATE TABLE public.operator_pins (
  operator_id uuid PRIMARY KEY REFERENCES public.operators(id) ON DELETE CASCADE,
  pin text NOT NULL CHECK (pin ~ '^[0-9]{4}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.operator_pins TO service_role;
ALTER TABLE public.operator_pins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.operator_pins(operator_id, pin)
SELECT id, lpad((floor(random()*10000))::int::text, 4, '0') FROM public.operators WHERE active;

CREATE OR REPLACE FUNCTION public._eq_check_operator_pin(p_operator_id uuid, p_pin text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v text;
BEGIN
  SELECT pin INTO v FROM operator_pins WHERE operator_id=p_operator_id;
  IF v IS NULL THEN RAISE EXCEPTION 'No code set for this operator. Ask admin for your code.'; END IF;
  IF p_pin IS DISTINCT FROM v THEN RAISE EXCEPTION 'Wrong code. Ask admin if you forgot it.'; END IF;
END $$;
REVOKE ALL ON FUNCTION public._eq_check_operator_pin(uuid,text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_operator_pin(p_operator_name text, p_pin text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS(SELECT 1 FROM operators o JOIN operator_pins p ON p.operator_id=o.id
    WHERE o.name=p_operator_name AND o.active AND p.pin=p_pin)
$$;
GRANT EXECUTE ON FUNCTION public.verify_operator_pin(text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_operator_pins(p_pin text)
RETURNS TABLE(operator_id uuid, pin text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  RETURN QUERY SELECT op.operator_id, op.pin FROM operator_pins op;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_operator_pins(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_operator_pin(p_pin text, p_operator_id uuid, p_new_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Code must be 4 digits'; END IF;
  INSERT INTO operator_pins(operator_id,pin) VALUES(p_operator_id,p_new_pin)
  ON CONFLICT (operator_id) DO UPDATE SET pin=excluded.pin, updated_at=now();
  RETURN jsonb_build_object('ok',true);
END $$;
GRANT EXECUTE ON FUNCTION public.admin_set_operator_pin(text,uuid,text) TO anon, authenticated, service_role;

DROP FUNCTION public.checkout_machine(text,text,text,boolean,text);
CREATE FUNCTION public.checkout_machine(p_machine_code text, p_operator_name text, p_task_location text, p_safe_confirmed boolean, p_fuel_level text DEFAULT NULL, p_operator_pin text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_m machines%rowtype; v_op operators%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_id uuid;
BEGIN
  SELECT * INTO v_op FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator is not authorized'; END IF;
  PERFORM public._eq_check_operator_pin(v_op.id, p_operator_pin);
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'DO NOT OPERATE - this machine has an open issue'; END IF;
  IF public.eod_missing(v_m.last_eod_date, v_m.current_operator_id IS NOT NULL, v_m.custody_since, v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  END IF;
  IF v_m.current_operator_id IS NOT NULL THEN RAISE EXCEPTION 'Machine is already checked out. Use Transfer machine.'; END IF;
  IF p_safe_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Safety confirmation is required'; END IF;
  IF nullif(trim(p_task_location),'') IS NULL THEN RAISE EXCEPTION 'Task/location is required'; END IF;
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
REVOKE ALL ON FUNCTION public.checkout_machine(text,text,text,boolean,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.checkout_machine(text,text,text,boolean,text,text) TO anon, authenticated, service_role;

DROP FUNCTION public.accept_transfer(text,text,text);
CREATE FUNCTION public.accept_transfer(p_machine_code text, p_operator_name text, p_task_location text, p_operator_pin text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_m machines%rowtype; v_to operators%rowtype; v_auth transfer_authorizations%rowtype; v_id uuid;
BEGIN
  SELECT * INTO v_to FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator not found'; END IF;
  PERFORM public._eq_check_operator_pin(v_to.id, p_operator_pin);
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'DO NOT OPERATE - this machine cannot be transferred'; END IF;
  IF public.eod_missing(v_m.last_eod_date,v_m.current_operator_id IS NOT NULL,v_m.custody_since,v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  END IF;
  IF v_m.current_operator_id IS NULL THEN RAISE EXCEPTION 'Machine is not currently checked out'; END IF;
  IF nullif(trim(p_task_location),'') IS NULL THEN RAISE EXCEPTION 'Task/location is required'; END IF;
  IF v_to.id=v_m.current_operator_id THEN RAISE EXCEPTION 'You already hold this machine'; END IF;
  IF NOT public.operator_can_use(v_to.id, v_m.id) THEN RAISE EXCEPTION '% is not authorized for this machine', v_to.name; END IF;
  SELECT * INTO v_auth FROM transfer_authorizations WHERE machine_id=v_m.id AND to_operator_id=v_to.id
    AND from_operator_id=v_m.current_operator_id
    AND used_at IS NULL AND valid_date=(now() at time zone 'America/Chicago')::date
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No valid transfer authorization for you on this machine today. Admin approval is required.'; END IF;
  UPDATE transfer_authorizations SET used_at=now() WHERE id=v_auth.id;
  INSERT INTO activities(machine_id,type,from_operator_id,to_operator_id,task_location,authorization_id)
  VALUES(v_m.id,'transfer',v_auth.from_operator_id,v_to.id,trim(p_task_location),v_auth.id) RETURNING id INTO v_id;
  UPDATE machines SET current_operator_id=v_to.id,current_task_location=trim(p_task_location),last_activity_at=now(),last_activity_type='transfer' WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'activity_id',v_id,'machine',p_machine_code,'operator',p_operator_name);
END $function$;
REVOKE ALL ON FUNCTION public.accept_transfer(text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_transfer(text,text,text,text) TO anon, authenticated, service_role;