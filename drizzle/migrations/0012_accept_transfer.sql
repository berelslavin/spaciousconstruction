CREATE OR REPLACE FUNCTION public.my_pending_transfers(p_operator_name text)
RETURNS TABLE(machine_code text, machine_name text, from_operator text, authorized_by text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_op operators%rowtype;
BEGIN
  SELECT * INTO v_op FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
    SELECT m.code, m.name, ofrom.name, ta.authorized_by, ta.created_at
    FROM transfer_authorizations ta
    JOIN machines m ON m.id=ta.machine_id AND m.active=true
    JOIN operators ofrom ON ofrom.id=ta.from_operator_id
    WHERE ta.to_operator_id=v_op.id AND ta.used_at IS NULL
      AND ta.valid_date=(now() at time zone 'America/Chicago')::date
      AND m.current_operator_id=ta.from_operator_id
      AND m.do_not_operate=false
      AND NOT public.eod_missing(m.last_eod_date,true,m.custody_since,m.created_at)
    ORDER BY ta.created_at DESC;
END $function$;

CREATE OR REPLACE FUNCTION public.accept_transfer(p_machine_code text, p_operator_name text, p_task_location text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_m machines%rowtype; v_to operators%rowtype; v_auth transfer_authorizations%rowtype; v_id uuid;
BEGIN
  SELECT * INTO v_m FROM machines WHERE code=p_machine_code AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.do_not_operate THEN RAISE EXCEPTION 'DO NOT OPERATE - this machine cannot be transferred'; END IF;
  IF public.eod_missing(v_m.last_eod_date,v_m.current_operator_id IS NOT NULL,v_m.custody_since,v_m.created_at) THEN
    RAISE EXCEPTION 'End-of-day return confirmation is missing. Complete Return / end-of-day first.';
  END IF;
  IF v_m.current_operator_id IS NULL THEN RAISE EXCEPTION 'Machine is not currently checked out'; END IF;
  IF nullif(trim(p_task_location),'') IS NULL THEN RAISE EXCEPTION 'Task/location is required'; END IF;
  SELECT * INTO v_to FROM operators WHERE name=p_operator_name AND active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator not found'; END IF;
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

GRANT EXECUTE ON FUNCTION public.my_pending_transfers(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_transfer(text,text,text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_pending_transfers(text) FROM public;
REVOKE ALL ON FUNCTION public.accept_transfer(text,text,text) FROM public;