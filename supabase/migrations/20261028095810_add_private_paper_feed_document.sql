ALTER TABLE public.phd_private_papers
  ADD COLUMN IF NOT EXISTS document jsonb NOT NULL
  DEFAULT '{"papers":[],"today_ids":[]}'::jsonb;

UPDATE public.phd_private_papers
SET document = '{"papers":[],"today_ids":[]}'::jsonb
WHERE id = 1 AND document IS NULL;
