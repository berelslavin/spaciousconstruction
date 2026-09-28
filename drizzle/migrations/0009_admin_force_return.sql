CREATE OR REPLACE FUNCTION public.admin_force_return(p_pin text, p_machine_id uuid, p_by text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_m machines%rowtype; v_today date := (now() at time zone 'America/Chicago')::date; v_prev text;
BEGIN
  PERFORM public._eq_require_pin(p_pin);
  IF nullif(trim(p_by),'') IS NULL THEN RAISE EXCEPTION 'Your name is required'; END IF;
  IF nullif(trim(p_note),'') IS NULL THEN RAISE EXCEPTION 'A note explaining the force return is required'; END IF;
  SELECT * INTO v_m FROM machines WHERE id=p_machine_id AND active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  IF v_m.current_operator_id IS NULL AND NOT public.eod_missing(v_m.last_eod_date,false,NULL,v_m.created_at) THEN
    RAISE EXCEPTION 'Machine is not checked out and end-of-day is already complete';
  END IF;
  SELECT name INTO v_prev FROM operators WHERE id=v_m.current_operator_id;
  INSERT INTO activities(machine_id,type,from_operator_id,task_location,note)
  VALUES(v_m.id,'force_return',v_m.current_operator_id,v_m.return_location,
    'Admin force return by '||trim(p_by)||coalesce(' (was with '||v_prev||')','')||': '||trim(p_note));
  UPDATE machines SET current_operator_id=NULL,current_task_location=NULL,custody_since=NULL,
    last_activity_at=now(),last_activity_type='force_return',last_eod_date=v_today WHERE id=v_m.id;
  RETURN jsonb_build_object('ok',true,'machine',v_m.code,'eod_date',v_today);
END $$;
REVOKE ALL ON FUNCTION public.admin_force_return(text,uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_force_return(text,uuid,text,text) TO anon, authenticated, service_role;