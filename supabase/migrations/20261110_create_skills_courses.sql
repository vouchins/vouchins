-- ============================================================================
-- Migration: Skills Development Free Courses & Curated Resources
-- Date: 2026-11-10
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.skills_courses (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL,
  url text NOT NULL,
  secondary_url text,
  secondary_url_label text,
  type text NOT NULL DEFAULT 'guide',
  difficulty text DEFAULT 'All Levels',
  is_free boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  domain text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_courses_category ON public.skills_courses(category);
CREATE INDEX IF NOT EXISTS idx_skills_courses_featured ON public.skills_courses(featured);
CREATE INDEX IF NOT EXISTS idx_skills_courses_created_at ON public.skills_courses(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.skills_courses ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anonymous) can view skill courses
CREATE POLICY "Allow public read access to skills courses"
  ON public.skills_courses
  FOR SELECT
  USING (true);

-- Only admins can insert, update, or delete skill courses
CREATE POLICY "Allow admins full access to skills courses"
  ON public.skills_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

