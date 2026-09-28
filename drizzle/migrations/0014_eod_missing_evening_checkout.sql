CREATE OR REPLACE FUNCTION public.eod_missing(p_last_eod date, p_in_custody boolean, p_custody_since timestamp with time zone, p_machine_created timestamp with time zone, p_now timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with r as (select public.eod_required_date(p_now) d, public.eq_cutoff() c,
                    (p_now at time zone 'America/Chicago') l,
                    (select rain_day from app_settings where id=1) rain)
  select case
    when r.rain is not null and r.rain = r.l::date then false
    -- In custody: missing only if a cutoff has passed since custody began
    -- (evening checkouts after the cutoff are due at the next cutoff).
    when p_in_custody then (p_custody_since is null
         or p_custody_since < ((r.d + r.c) at time zone 'America/Chicago'))
    when p_machine_created >= ((r.d + r.c) at time zone 'America/Chicago') then false
    when p_last_eod is null then true
    when p_last_eod < r.d then true
    else false end
  from r $function$;