-- Seed default app_config keys (admin-editable later)
INSERT INTO public.app_config (key, value)
VALUES
  ('fireworks_at', '2026-07-03T21:15:00-04:00'),
  ('photo_drive_folder_id', '')
ON CONFLICT (key) DO NOTHING;

-- Allow anyone to read these two specific public keys
CREATE POLICY "Anyone can view public app config keys"
ON public.app_config
FOR SELECT
TO public
USING (key IN ('fireworks_at', 'photo_drive_folder_id'));

-- Photo submissions table
CREATE TABLE public.photo_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitter_name TEXT,
  instagram_handle TEXT,
  caption TEXT,
  drive_file_id TEXT,
  drive_file_url TEXT,
  drive_file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage photo submissions"
ON public.photo_submissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert (the edge function inserts after a successful Drive upload).
-- Length limits to prevent abuse.
CREATE POLICY "Anyone can submit photo metadata"
ON public.photo_submissions
FOR INSERT
TO public
WITH CHECK (
  (submitter_name IS NULL OR length(submitter_name) <= 100)
  AND (instagram_handle IS NULL OR length(instagram_handle) <= 100)
  AND (caption IS NULL OR length(caption) <= 1000)
);

CREATE INDEX idx_photo_submissions_created_at ON public.photo_submissions(created_at DESC);