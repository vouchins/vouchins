-- ============================================================================
-- Migration: Job Pass / Jobs Pro Resume Intelligence & Interactive Editor Tables
-- Date: 2026-11-03
-- ============================================================================

-- If legacy accelerator_* tables exist in the target database, safely rename them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accelerator_resumes') THEN
    ALTER TABLE public.accelerator_resumes RENAME TO job_resumes;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accelerator_evaluations') THEN
    ALTER TABLE public.accelerator_evaluations RENAME TO job_evaluations;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accelerator_versions') THEN
    ALTER TABLE public.accelerator_versions RENAME TO job_resume_versions;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accelerator_usage_logs') THEN
    ALTER TABLE public.accelerator_usage_logs RENAME TO job_ai_usage_logs;
  END IF;
END $$;

-- 1. Subscriptions Table (Paid Access Gating)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('jobs_pro', 'accelerator_pro', 'premium_bundle')),
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  payment_provider text DEFAULT 'stripe',
  external_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update check constraint if subscriptions already exists
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('jobs_pro', 'accelerator_pro', 'premium_bundle'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Helper SQL Function: Check if user has active Jobs Pro subscription or is admin
CREATE OR REPLACE FUNCTION public.has_active_jobs_subscription(check_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Admins always have access
  IF EXISTS (SELECT 1 FROM public.users WHERE id = check_user_id AND is_admin = true) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = check_user_id
      AND status IN ('active', 'trialing')
      AND current_period_end > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Job Resumes
CREATE TABLE IF NOT EXISTS public.job_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Resume',
  file_name text,
  file_size integer,
  storage_path text,
  raw_text text,
  content_hash text,
  document_schema jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_resumes_user_id ON public.job_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_resumes_hash ON public.job_resumes(user_id, content_hash);

-- 3. Job Evaluations
CREATE TABLE IF NOT EXISTS public.job_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.job_resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_hash text,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  pillar_scores jsonb NOT NULL,
  detected_seniority text NOT NULL,
  target_role text NOT NULL,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_match_vectors jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_evaluations_resume_id ON public.job_evaluations(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_evaluations_hash ON public.job_evaluations(user_id, content_hash);

-- 4. Job Resume Version History
CREATE TABLE IF NOT EXISTS public.job_resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.job_resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_schema jsonb NOT NULL,
  change_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_resume_versions_resume_id ON public.job_resume_versions(resume_id);

-- 5. Job AI Usage Audit & Rate Limiting Logs
CREATE TABLE IF NOT EXISTS public.job_ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'evaluate', 'rewrite_bullet', 'extract'
  provider text NOT NULL, -- 'gemini', 'openai', 'heuristic'
  model text,
  input_chars integer,
  estimated_tokens integer,
  content_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_ai_usage_user_window 
ON public.job_ai_usage_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_job_ai_usage_created_at 
ON public.job_ai_usage_logs(created_at);

-- 6. Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read own subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own resumes" ON public.job_resumes;
CREATE POLICY "Users manage own resumes"
ON public.job_resumes FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own evaluations" ON public.job_evaluations;
CREATE POLICY "Users manage own evaluations"
ON public.job_evaluations FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own versions" ON public.job_resume_versions;
CREATE POLICY "Users manage own versions"
ON public.job_resume_versions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own usage logs" ON public.job_ai_usage_logs;
CREATE POLICY "Users read own usage logs"
ON public.job_ai_usage_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

