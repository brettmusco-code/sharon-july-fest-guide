-- Add scheduled_for to messages (NULL = publish immediately)
ALTER TABLE public.messages
  ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_messages_scheduled_for ON public.messages(scheduled_for);

-- Replace public read policy to hide future-scheduled messages
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;

CREATE POLICY "Anyone can view published messages"
  ON public.messages FOR SELECT
  USING (scheduled_for IS NULL OR scheduled_for <= now());

-- Admins still see everything (including scheduled future messages)
CREATE POLICY "Admins view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view faqs"
  ON public.faqs FOR SELECT
  USING (true);

CREATE POLICY "Admins manage faqs"
  ON public.faqs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER faqs_set_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_faqs_sort_order ON public.faqs(sort_order);