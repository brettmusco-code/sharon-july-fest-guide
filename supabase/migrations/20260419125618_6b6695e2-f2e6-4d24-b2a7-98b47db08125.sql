CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  promoted_faq_id UUID REFERENCES public.faqs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit questions"
ON public.questions FOR INSERT
TO public
WITH CHECK (
  length(question) > 0
  AND length(question) <= 1000
  AND answer IS NULL
  AND status = 'new'
  AND promoted_faq_id IS NULL
);

CREATE POLICY "Admins manage questions"
ON public.questions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_questions_status_created ON public.questions(status, created_at DESC);