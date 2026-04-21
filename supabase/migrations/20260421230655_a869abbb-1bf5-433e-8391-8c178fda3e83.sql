-- Table to store FCM device push tokens for native (iOS/Android) installs.
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can read tokens; the edge function uses service-role and bypasses RLS.
CREATE POLICY "Admins can view push tokens"
ON public.device_push_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete push tokens"
ON public.device_push_tokens
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_device_push_tokens_updated_at
BEFORE UPDATE ON public.device_push_tokens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC the client calls to upsert its FCM token. SECURITY DEFINER so anonymous users
-- (no auth required for native pushes) can register without needing INSERT policies.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RAISE EXCEPTION 'token required';
  END IF;
  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;

  INSERT INTO public.device_push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (token) DO UPDATE
    SET platform = EXCLUDED.platform,
        user_id = EXCLUDED.user_id,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_push_token(TEXT, TEXT) TO anon, authenticated;