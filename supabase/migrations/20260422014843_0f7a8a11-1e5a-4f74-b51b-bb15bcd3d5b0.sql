
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ip_address text;

CREATE OR REPLACE FUNCTION public.set_analytics_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hdrs jsonb;
  xff text;
  ip text;
BEGIN
  -- Try to get IP from request headers (PostgREST sets this GUC)
  BEGIN
    hdrs := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    hdrs := NULL;
  END;

  IF hdrs IS NOT NULL THEN
    xff := hdrs->>'x-forwarded-for';
    IF xff IS NOT NULL AND length(xff) > 0 THEN
      -- First IP in X-Forwarded-For is the original client
      ip := split_part(xff, ',', 1);
      ip := trim(ip);
    END IF;
    IF ip IS NULL OR length(ip) = 0 THEN
      ip := hdrs->>'cf-connecting-ip';
    END IF;
    IF ip IS NULL OR length(ip) = 0 THEN
      ip := hdrs->>'x-real-ip';
    END IF;
  END IF;

  NEW.ip_address := ip;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_events_set_ip ON public.analytics_events;
CREATE TRIGGER analytics_events_set_ip
  BEFORE INSERT ON public.analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_analytics_ip();
