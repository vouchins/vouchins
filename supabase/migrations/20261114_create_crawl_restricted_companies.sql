-- ============================================================================
-- Migration: Add crawl restrictions table for Job Crawler Engine
-- Date: 2026-11-14
-- ============================================================================

-- 1. Create dedicated crawl_restricted_companies table
CREATE TABLE IF NOT EXISTS public.crawl_restricted_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index on name for case-insensitive lookup
CREATE INDEX IF NOT EXISTS idx_crawl_restricted_companies_name 
  ON public.crawl_restricted_companies (lower(name));

-- 2. Optional flag on companies table for fast query filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'is_crawl_restricted'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN is_crawl_restricted boolean DEFAULT false;
  END IF;
END $$;

-- 3. Row Level Security (RLS)
ALTER TABLE public.crawl_restricted_companies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admin users full access
CREATE POLICY "crawl_restricted_companies_admin_all"
  ON public.crawl_restricted_companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

