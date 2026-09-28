DROP POLICY IF EXISTS "field app can upload equipment photos" ON storage.objects;
CREATE POLICY "field app can upload equipment photos" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'equipment-photos'
  AND name ~ '^[A-Z]{2}-[0-9]{3}/[0-9]{13}-[a-z0-9]{1,8}\.jpg$'
  AND EXISTS (SELECT 1 FROM public.machine_dashboard m WHERE m.code = split_part(name, '/', 1))
);