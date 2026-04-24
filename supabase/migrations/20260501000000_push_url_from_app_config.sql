-- Use app_config.push_edge_function_url so the message trigger works on any project (not a hardcoded ref).
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_secret TEXT;
  function_url TEXT;
  attempt_id UUID;
BEGIN
  SELECT value INTO function_url FROM public.app_config WHERE key = 'push_edge_function_url';
  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'push_webhook_secret';

  IF function_url IS NULL OR trim(function_url) = '' THEN
    INSERT INTO public.push_attempts (message_id, message_title, status, error, completed_at)
    VALUES (NEW.id, NEW.title, 'skipped', 'push_edge_function_url not set in app_config', now());
    RAISE WARNING 'push_edge_function_url not set in app_config; skipping push';
    RETURN NEW;
  END IF;

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
