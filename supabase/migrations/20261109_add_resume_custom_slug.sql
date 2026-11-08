-- ============================================================================
-- Migration: Add custom_slug to job_resumes for LinkedIn-style vanity URLs
-- Date: 2026-11-09
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'job_resumes' 
      AND column_name = 'custom_slug'
  ) THEN
    ALTER TABLE public.job_resumes ADD COLUMN custom_slug text;
  END IF;
END $$;

-- Enforce case-insensitive unique index on custom_slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_resumes_custom_slug_unique 
ON public.job_resumes (lower(custom_slug)) 
WHERE custom_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_resumes_custom_slug 
ON public.job_resumes (custom_slug);

