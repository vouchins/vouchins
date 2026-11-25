-- Add structured AI extraction metadata for resumes and jobs
ALTER TABLE public.job_resumes
  ADD COLUMN IF NOT EXISTS extracted_profile jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_extracted_at timestamptz DEFAULT NULL;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ai_extracted_metadata jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_extracted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_ai_extracted_at
  ON public.jobs (ai_extracted_at)
  WHERE is_active = true;
