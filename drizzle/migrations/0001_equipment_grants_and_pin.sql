ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "machines readable" ON public.machines;
CREATE POLICY "machines readable" ON public.machines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "operators readable" ON public.operators;
CREATE POLICY "operators readable" ON public.operators FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "activities readable" ON public.activities;
CREATE POLICY "activities readable" ON public.activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "issues readable" ON public.issues;
CREATE POLICY "issues readable" ON public.issues FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.machines TO anon, authenticated;
GRANT SELECT ON public.operators TO anon, authenticated;
GRANT SELECT ON public.activities TO anon, authenticated;
GRANT SELECT ON public.issues TO anon, authenticated;
GRANT SELECT ON public.machine_dashboard TO anon, authenticated;
GRANT ALL ON public.machines, public.operators, public.activities, public.issues,
  public.app_settings, public.transfer_authorizations TO service_role;

CREATE OR REPLACE VIEW public.app_settings_public
WITH (security_invoker = false) AS
  SELECT id, timezone, eod_cutoff, sheets_connected, sheets_url FROM public.app_settings;
GRANT SELECT ON public.app_settings_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_admin_pin(p_pin text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_settings WHERE id = 1 AND admin_pin = p_pin);
$$;
GRANT EXECUTE ON FUNCTION public.verify_admin_pin(text) TO anon, authenticated;

COMMENT ON TABLE public.equipment_assets IS 'DEPRECATED: replaced by public.machines / machine_dashboard';
COMMENT ON TABLE public.equipment_events IS 'DEPRECATED: replaced by public.activities';