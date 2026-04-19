ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_event_type_check
  CHECK (event_type IN ('page_visit', 'event_click', 'sponsor_click', 'faq_open'));

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_target_id_len CHECK (target_id IS NULL OR length(target_id) <= 100),
  ADD CONSTRAINT analytics_target_label_len CHECK (target_label IS NULL OR length(target_label) <= 200),
  ADD CONSTRAINT analytics_session_id_len CHECK (session_id IS NULL OR length(session_id) <= 64);