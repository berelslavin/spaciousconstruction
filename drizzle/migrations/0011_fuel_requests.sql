ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS fuel_runner boolean NOT NULL DEFAULT false;

CREATE TABLE public.fuel_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id),
  requested_by uuid REFERENCES public.operators(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  fueled_by text,
  fueled_at timestamptz,
  fuel_level text
);
GRANT ALL ON public.fuel_requests TO service_role;
ALTER TABLE public.fuel_requests ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX fuel_requests_one_open ON public.fuel_requests(machine_id) WHERE fueled_at IS NULL;

CREATE OR REPLACE FUNCTION public.request_fuel(p_machine_code text, p_operator_name text, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m machines; o operators; existing uuid;
BEGIN
  SELECT * INTO m FROM machines WHERE code = p_machine_code AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Machine not found'; END IF;
  SELECT * INTO o FROM operators WHERE name = p_operator_name AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operator not found'; END IF;
  IF m.current_operator_id IS DISTINCT FROM o.id THEN
    RAISE EXCEPTION 'Only the person holding % can request fuel', m.code;
  END IF;
  SELECT id INTO existing FROM fuel_requests WHERE machine_id = m.id AND fueled_at IS NULL;
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  INSERT INTO fuel_requests(machine_id, requested_by, note) VALUES (m.id, o.id, NULLIF(trim(coalesce(p_note,'')),''));
  INSERT INTO activities(machine_id, type, operator_id, task_location, note)
    VALUES (m.id, 'fuel_request', o.id, m.current_task_location, NULLIF(trim(coalesce(p_note,'')),''));
  RETURN jsonb_build_object('ok', true, 'already', false);
END $$;

CREATE OR REPLACE FUNCTION public.open_fuel_requests()
RETURNS TABLE(id uuid, machine_code text, machine_name text, requested_by text, task_location text, note text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, m.code, m.name, o.name, m.current_task_location, f.note, f.created_at
  FROM fuel_requests f JOIN machines m ON m.id = f.machine_id
  LEFT JOIN operators o ON o.id = f.requested_by
  WHERE f.fueled_at IS NULL ORDER BY f.created_at
$$;

CREATE OR REPLACE FUNCTION public.fuel_runners()
RETURNS TABLE(name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name FROM operators WHERE active AND fuel_runner ORDER BY name
$$;

CREATE OR REPLACE FUNCTION public.complete_fuel_request(p_id uuid, p_by text, p_fuel_level text, p_pin text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f fuel_requests; runner operators;
BEGIN
  IF p_fuel_level NOT IN ('Full','¾','½','¼','Needs Fuel') THEN RAISE EXCEPTION 'Pick a fuel level'; END IF;
  IF trim(coalesce(p_by,'')) = '' THEN RAISE EXCEPTION 'Name required'; END IF;
  IF p_pin IS NOT NULL AND p_pin <> '' THEN
    PERFORM _eq_require_pin(p_pin);
  ELSE
    SELECT * INTO runner FROM operators WHERE name = p_by AND active AND fuel_runner;
    IF NOT FOUND THEN RAISE EXCEPTION '% is not assigned to fuel machines', p_by; END IF;
  END IF;
  SELECT * INTO f FROM fuel_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF f.fueled_at IS NOT NULL THEN RAISE EXCEPTION 'Already marked fueled'; END IF;
  UPDATE fuel_requests SET fueled_by = p_by, fueled_at = now(), fuel_level = p_fuel_level WHERE id = p_id;
  UPDATE machines SET fuel_level = p_fuel_level,
    fuel_logged_date = (now() AT TIME ZONE 'America/Chicago')::date,
    last_activity_at = now(), last_activity_type = 'fueled'
  WHERE id = f.machine_id;
  INSERT INTO activities(machine_id, type, operator_id, fuel_level, note)
    VALUES (f.machine_id, 'fueled', runner.id, p_fuel_level, 'Fueled by ' || p_by);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_fuel_runner(p_pin text, p_operator_id uuid, p_on boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _eq_require_pin(p_pin);
  UPDATE operators SET fuel_runner = p_on WHERE id = p_operator_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.request_fuel(text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.open_fuel_requests() FROM public;
REVOKE ALL ON FUNCTION public.fuel_runners() FROM public;
REVOKE ALL ON FUNCTION public.complete_fuel_request(uuid,text,text,text) FROM public;
REVOKE ALL ON FUNCTION public.admin_set_fuel_runner(text,uuid,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.request_fuel(text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.open_fuel_requests() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fuel_runners() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_fuel_request(uuid,text,text,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_fuel_runner(text,uuid,boolean) TO anon, authenticated, service_role;