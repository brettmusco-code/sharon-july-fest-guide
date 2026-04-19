ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_event_type_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_event_type_check
  CHECK (event_type IN ('page_visit', 'event_click', 'sponsor_click', 'faq_open', 'map_pin_click'));