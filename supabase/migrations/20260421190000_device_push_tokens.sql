-- Device tokens for FCM (Android + iOS). No direct client SELECT; registration via RPC only.

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_push_tokens_platform_idx ON public.device_push_tokens (platform);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Block direct table access from PostgREST (Edge Functions use service_role and bypass RLS.)
CREATE POLICY "device_push_tokens_no_select"
  ON public.device_push_tokens FOR SELECT TO authenticated, anon USING (false);

CREATE POLICY "device_push_tokens_no_insert"
  ON public.device_push_tokens FOR INSERT TO authenticated, anon WITH CHECK (false);

CREATE POLICY "device_push_tokens_no_update"
  ON public.device_push_tokens FOR UPDATE TO authenticated, anon USING (false);

CREATE POLICY "device_push_tokens_no_delete"
  ON public.device_push_tokens FOR DELETE TO authenticated, anon USING (false);

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 80 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  IF p_platform NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'invalid platform';
  END IF;
  INSERT INTO public.device_push_tokens (token, platform)
  VALUES (trim(p_token), p_platform)
  ON CONFLICT (token) DO UPDATE
    SET platform = excluded.platform,
        updated_at = now();
END;
$$;

REVOKE ALL ON TABLE public.device_push_tokens FROM PUBLIC;
GRANT ALL ON TABLE public.device_push_tokens TO service_role;

GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;

COMMENT ON TABLE public.device_push_tokens IS 'FCM device tokens; populated from the mobile app via register_push_token()';
