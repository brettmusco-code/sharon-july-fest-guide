CREATE TABLE public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sponsors"
  ON public.sponsors FOR SELECT
  USING (true);

CREATE POLICY "Admins manage sponsors"
  ON public.sponsors FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER sponsors_set_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.sponsors (name, url, logo_url, sort_order) VALUES
  ('Dedham Savings', 'https://www.dedhamsavings.com/', 'https://sharonjuly4.org/uploads/1/1/7/7/117790431/dedham-logo-vertical-color_orig.png', 10),
  ('Dunkin''', 'https://www.dunkindonuts.com/en', 'https://sharonjuly4.org/uploads/1/1/7/7/117790431/dunkin-logo-mid_orig.jpeg', 20),
  ('Koopman Lumber', 'https://koopmanlumber.com/', 'https://sharonjuly4.org/uploads/1/1/7/7/117790431/koopman2_orig.png', 30),
  ('The Needle Group', 'https://www.theneedlegroup.com/', 'https://sharonjuly4.org/uploads/1/1/7/7/117790431/needle-sj4_orig.png', 40),
  ('Orchard Cove', 'https://www.hebrewseniorlife.org/orchard-cove', 'https://sharonjuly4.org/uploads/1/1/7/7/117790431/orchardcove_orig.jpeg', 50);