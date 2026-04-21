CREATE TABLE IF NOT EXISTS public.push_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID,
  message_title TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent INT,
  failed INT,
  total INT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS push_attempts_created_at_idx
  ON public.push_attempts (created_at DESC);

ALTER TABLE public.push_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push attempts"
ON public.push_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete push attempts"
ON public.push_attempts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger function: insert a push_attempts row first, then POST its id to the edge function.
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_secret TEXT;
  function_url TEXT := 'https://uncnkmgaoawksbfncnkm.supabase.co/functions/v1/broadcast-push';
  attempt_id UUID;
BEGIN
  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'push_webhook_secret';

  IF webhook_secret IS NULL THEN
    INSERT INTO public.push_attempts (message_id, message_title, status, error, completed_at)
    VALUES (NEW.id, NEW.title, 'skipped', 'push_webhook_secret not set', now());
    RETURN NEW;
  END IF;

  INSERT INTO public.push_attempts (message_id, message_title, status)
  VALUES (NEW.id, NEW.title, 'pending')
  RETURNING id INTO attempt_id;

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', to_jsonb(NEW),
      'attempt_id', attempt_id
    )
  );

  RETURN NEW;
END;
$$;