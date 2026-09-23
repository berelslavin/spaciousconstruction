-- Machine custody for the /equipment field route.
-- Custody is derived from the event log, so assets are read-only to the field app.

CREATE TABLE public.equipment_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Tool',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.equipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.equipment_assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('checkout','transfer','return','issue')),
  worker TEXT NOT NULL DEFAULT '',
  to_worker TEXT NOT NULL DEFAULT '',
  house TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT '' CHECK (severity IN ('','low','medium','high')),
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX equipment_events_asset_time_idx ON public.equipment_events (asset_id, created_at DESC);
CREATE INDEX equipment_events_time_idx ON public.equipment_events (created_at DESC);

GRANT SELECT ON public.equipment_assets TO anon, authenticated;
GRANT ALL ON public.equipment_assets TO service_role;
GRANT SELECT, INSERT ON public.equipment_events TO anon, authenticated;
GRANT ALL ON public.equipment_events TO service_role;

ALTER TABLE public.equipment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment assets are readable" ON public.equipment_assets
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "equipment events are readable" ON public.equipment_events
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "field app can log equipment events" ON public.equipment_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Field photos live in the private equipment-photos bucket.
CREATE POLICY "field app can upload equipment photos" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'equipment-photos');

CREATE POLICY "field app can read equipment photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'equipment-photos');

-- Starter machine list; replace or extend as needed.
INSERT INTO public.equipment_assets (code, name, category) VALUES
  ('GEN-04','Generac 25kW generator','Power'),
  ('WALK-02','Wacker 1201 plate compactor','Compaction'),
  ('SLD-01','Screed 12 ft magnesium screed','Concrete'),
  ('Saw-07','Husqvarna FS 400 floor saw','Concrete'),
  ('LIFT-03','Genie GS-1930 scissor lift','Lift'),
  ('COMP-05','Atlas Copco XAS 185 compressor','Air'),
  ('PUMP-02','Vulcan 6 in trash pump','Water'),
  ('MIX-06','Wacker WS 90 concrete mixer','Concrete'),
  ('BEND-01','Rebar bender and cutter','Steel'),
  ('LIGHT-09','Reel light tower 4 x 1000W','Power');
