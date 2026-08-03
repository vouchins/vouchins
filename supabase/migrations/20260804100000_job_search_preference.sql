-- Recruiter-only job-search preference managed from private profile settings.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS job_search_status text;

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_job_search_status_check;

ALTER TABLE public.users
ADD CONSTRAINT users_job_search_status_check
CHECK (
  job_search_status IS NULL
  OR job_search_status IN (
    'open_to_work',
    'open_to_opportunities',
    'not_looking'
  )
);
