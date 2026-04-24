-- 1. Add pushed_at column to track delivery
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

-- 2. Helper function that actually sends the push for a given message row
CREATE OR REPLACE FUNCTION public.send_message_push(_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  webhook_secret TEXT;
  function_url TEXT := 'https://exnfwgygwdrtrmlrichj.supabase.co/functions/v1/broadcast-push';
  attempt_id UUID;
  msg RECORD;
BEGIN
  SELECT * INTO msg FROM public.messages WHERE id = _message_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Don't double-send
  IF msg.pushed_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT value INTO webhook_secret FROM public.app_config WHERE key = 'push_webhook_secret';

  IF webhook_secret IS NULL THEN
    INSERT INTO public.push_attempts (message_id, message_title, status, error, completed_at)
    VALUES (msg.id, msg.title, 'skipped', 'push_webhook_secret not set', now());
    RETURN;
  END IF;

  INSERT INTO public.push_attempts (message_id, message_title, status)
  VALUES (msg.id, msg.title, 'pending')
  RETURNING id INTO attempt_id;

  -- Mark as pushed BEFORE the http_post so a slow function doesn't get re-fired by cron
  UPDATE public.messages SET pushed_at = now() WHERE id = msg.id;

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'messages',
      'record', to_jsonb(msg),
      'attempt_id', attempt_id
    )
  );
END;
$$;

-- 3. Replace the insert trigger function: only push immediately if not scheduled in the future
CREATE OR REPLACE FUNCTION public.notify_message_inserted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.scheduled_for IS NULL OR NEW.scheduled_for <= now() THEN
    PERFORM public.send_message_push(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger on UPDATE too — if admin edits a scheduled message and the time has now arrived
CREATE OR REPLACE FUNCTION public.notify_message_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.pushed_at IS NULL
     AND (NEW.scheduled_for IS NULL OR NEW.scheduled_for <= now()) THEN
    PERFORM public.send_message_push(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Recreate triggers
DROP TRIGGER IF EXISTS messages_notify_insert ON public.messages;
CREATE TRIGGER messages_notify_insert
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_inserted();

DROP TRIGGER IF EXISTS messages_notify_update ON public.messages;
CREATE TRIGGER messages_notify_update
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_updated();

-- 6. Function the cron will call: dispatch any due scheduled messages
CREATE OR REPLACE FUNCTION public.dispatch_scheduled_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  m RECORD;
BEGIN
  FOR m IN
    SELECT id FROM public.messages
    WHERE pushed_at IS NULL
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= now()
  LOOP
    PERFORM public.send_message_push(m.id);
  END LOOP;
END;
$$;

-- 7. Backfill: messages that were already sent (pre-existing) shouldn't get re-pushed by cron
UPDATE public.messages
SET pushed_at = COALESCE(pushed_at, created_at)
WHERE pushed_at IS NULL
  AND (scheduled_for IS NULL OR scheduled_for <= now());