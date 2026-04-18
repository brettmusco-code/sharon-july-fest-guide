
-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT '📌',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  category_slug TEXT NOT NULL REFERENCES public.categories(slug) ON UPDATE CASCADE,
  icon TEXT NOT NULL DEFAULT '📌',
  pin_x NUMERIC NOT NULL DEFAULT 50,
  pin_y NUMERIC NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Anyone can view events" ON public.events
  FOR SELECT USING (true);
CREATE POLICY "Admins manage events" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Map settings (single row)
CREATE TABLE public.map_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.map_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_map_settings_updated BEFORE UPDATE ON public.map_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Anyone can view map settings" ON public.map_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins manage map settings" ON public.map_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.map_settings (map_image_url) VALUES (NULL);

-- Storage bucket for festival map
INSERT INTO storage.buckets (id, name, public) VALUES ('festival', 'festival', true);

CREATE POLICY "Public can read festival files" ON storage.objects
  FOR SELECT USING (bucket_id = 'festival');
CREATE POLICY "Admins upload festival files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'festival' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update festival files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'festival' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete festival files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'festival' AND public.has_role(auth.uid(), 'admin'));

-- Seed categories
INSERT INTO public.categories (slug, name, color, icon, sort_order) VALUES
  ('food', 'Food & Drink', '#f59e0b', '🌭', 1),
  ('entertainment', 'Entertainment', '#6366f1', '🎵', 2),
  ('kids', 'Kids', '#10b981', '🎈', 3),
  ('general', 'General', '#8b5cf6', '🇺🇸', 4);

-- Seed events
INSERT INTO public.events (title, description, time, location, category_slug, icon, pin_x, pin_y, sort_order) VALUES
  ('Opening Ceremony & Flag Raising', 'Kick off the celebration with the flag raising ceremony at Memorial Park.', '9:00 AM', 'Memorial Park Beach', 'general', '🇺🇸', 26, 38, 1),
  ('Independence Day Parade', 'Floats, marching bands, and community groups march through downtown Sharon.', '10:00 AM', 'Main Street', 'entertainment', '🎺', 38, 19, 2),
  ('Kids Zone & Games', 'Face painting, sack races, water balloon toss, and more fun for all ages!', '11:00 AM - 4:00 PM', 'Memorial Park Field', 'kids', '🎈', 24, 36, 3),
  ('BBQ & Food Trucks', 'Classic American BBQ, ice cream, fried dough, and local food trucks.', '11:30 AM - 6:00 PM', 'Park Pavilion Area', 'food', '🌭', 30, 32, 4),
  ('Live Music: The Sharon All-Stars', 'Local bands perform patriotic hits and summer classics on the main stage.', '2:00 PM - 5:00 PM', 'Main Stage', 'entertainment', '🎵', 41, 26, 5),
  ('Grand Fireworks Show', 'The spectacular grand finale! Best viewed from the beach and surrounding fields.', '9:15 PM', 'Over Lake Massapoag', 'entertainment', '🎆', 42, 70, 6);
