-- pg_net is required to make outbound HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Tiny key/value table for server-side config secrets readable only by admins.
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view app config"
ON public.app_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage app config"
ON public.app_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger function: POST new message row to the broadcast-push edge function.
-- SECURITY DEFINER so it can read app_config and call extensions.http_post regardless of caller.
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_secret TEXT;
  function_url TEXT := 'https://uncnkmgaoawksbfncnkm.supabase.co/functions/v1/broadcast-push';
BEGIN
  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'push_webhook_secret';

  IF webhook_secret IS NULL THEN
    RAISE WARNING 'push_webhook_secret not set in app_config; skipping push';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_push ON public.messages;
CREATE TRIGGER messages_notify_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_inserted();