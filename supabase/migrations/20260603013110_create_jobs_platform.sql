-- ===============================
-- Recruiters (separate from users)
-- ===============================
CREATE TABLE IF NOT EXISTS recruiters (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_logo text,
  website text,
  billing_email text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================
-- Jobs
-- ===============================
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid REFERENCES recruiters(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  company_name text NOT NULL,
  description text NOT NULL,
  requirements text,
  location text NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary_range text,
  experience_level text NOT NULL CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead/director')),
  category text NOT NULL,
  impressions integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================
-- Job Applications
-- ===============================
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  resume_url text NOT NULL,
  cover_letter text,
  status text DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interviewing', 'offered', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_job_user_application UNIQUE (job_id, user_id)
);

-- ===============================
-- Job Views
-- ===============================
CREATE TABLE IF NOT EXISTS job_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ===============================
-- RLS Enablement
-- ===============================
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_views ENABLE ROW LEVEL SECURITY;

-- ===============================
-- RLS Policies
-- ===============================

-- Recruiters Policies
CREATE POLICY "recruiters_select" ON recruiters FOR SELECT TO authenticated USING (true);
CREATE POLICY "recruiters_insert" ON recruiters FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "recruiters_update" ON recruiters FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Jobs Policies
CREATE POLICY "jobs_select" ON jobs FOR SELECT TO authenticated USING (is_active = true OR recruiter_id = auth.uid());
CREATE POLICY "jobs_insert" ON jobs FOR INSERT TO authenticated WITH CHECK (recruiter_id = auth.uid());
CREATE POLICY "jobs_update" ON jobs FOR UPDATE TO authenticated USING (recruiter_id = auth.uid()) WITH CHECK (recruiter_id = auth.uid());
CREATE POLICY "jobs_delete" ON jobs FOR DELETE TO authenticated USING (recruiter_id = auth.uid());

-- Job Applications Policies
CREATE POLICY "applications_select_recruiter" ON job_applications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    job_id IN (SELECT id FROM jobs WHERE recruiter_id = auth.uid())
  );

CREATE POLICY "applications_insert_user" ON job_applications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_verified = true AND is_active = true)
  );

CREATE POLICY "applications_update_recruiter" ON job_applications FOR UPDATE TO authenticated
  USING (
    job_id IN (SELECT id FROM jobs WHERE recruiter_id = auth.uid())
  )
  WITH CHECK (
    job_id IN (SELECT id FROM jobs WHERE recruiter_id = auth.uid())
  );

-- Job Views Policies
CREATE POLICY "job_views_insert" ON job_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "job_views_select_recruiter" ON job_views FOR SELECT TO authenticated
  USING (
    job_id IN (SELECT id FROM jobs WHERE recruiter_id = auth.uid())
  );

-- ===============================
-- Storage Bucket for Resumes
-- ===============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for resumes
CREATE POLICY "Public Access to Resumes" ON storage.objects FOR SELECT TO public USING (bucket_id = 'resumes');
CREATE POLICY "Authenticated users can upload resumes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');

-- ===============================
-- Triggers for updated_at
-- ===============================
CREATE TRIGGER recruiters_updated_at BEFORE UPDATE ON recruiters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
