REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.machine_dashboard FROM anon, authenticated;
GRANT SELECT ON public.machine_dashboard TO anon, authenticated;