CREATE TABLE public.crew_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_date date NOT NULL,
  contractor_id text NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (local_date, contractor_id)
);
GRANT SELECT ON public.crew_checkins TO anon, authenticated;
GRANT ALL ON public.crew_checkins TO service_role;
ALTER TABLE public.crew_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins readable" ON public.crew_checkins FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.check_in_crew(p_contractor_id text)
RETURNS public.crew_checkins
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.crew_checkins; d date := (now() AT TIME ZONE 'America/Chicago')::date;
BEGIN
  IF coalesce(trim(p_contractor_id),'') = '' THEN RAISE EXCEPTION 'Contractor required'; END IF;
  INSERT INTO public.crew_checkins(local_date, contractor_id) VALUES (d, p_contractor_id)
  ON CONFLICT (local_date, contractor_id) DO NOTHING;
  SELECT * INTO r FROM public.crew_checkins WHERE local_date = d AND contractor_id = p_contractor_id;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.check_in_crew(text) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.crew_checkins;