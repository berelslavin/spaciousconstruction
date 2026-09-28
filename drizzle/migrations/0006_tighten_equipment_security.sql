DROP POLICY IF EXISTS "equipment assets are readable" ON public.equipment_assets;
DROP POLICY IF EXISTS "equipment events are readable" ON public.equipment_events;
DROP POLICY IF EXISTS "field app can log equipment events" ON public.equipment_events;
REVOKE ALL ON public.equipment_assets FROM anon, authenticated;
REVOKE ALL ON public.equipment_events FROM anon, authenticated;
DROP POLICY IF EXISTS "field app can read equipment photos" ON storage.objects;
DROP POLICY IF EXISTS "field app can upload equipment photos" ON storage.objects;
CREATE POLICY "field app can upload equipment photos" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'equipment-photos'
  AND name ~ '^[A-Z]{2}-[0-9]{3}/[0-9]{13}-[a-z0-9]{1,8}\.jpg$'
  AND EXISTS (SELECT 1 FROM public.machines m WHERE m.code = split_part(name, '/', 1) AND m.active)
);