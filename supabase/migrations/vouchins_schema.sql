/*
  # Vouchins Database Schema (Final)

  Authoritative schema for the Vouchins platform.

  Principles:
  - Supabase Auth owns passwords & sessions
  - email_otps is temporary, single-purpose
  - users table represents app-level state
  - RLS enforced everywhere except service-only tables
*/

-- ===============================
-- Extensions
-- ===============================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================
-- Companies
-- ===============================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ===============================
-- Users (app-level profile)
-- ===============================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  city text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_admin boolean DEFAULT false,
  onboarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================
-- Email OTPs (signup verification only)
-- ===============================
CREATE TABLE IF NOT EXISTS email_otps (
  email text PRIMARY KEY,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int4 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ===============================
-- Posts
-- ===============================
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  category text NOT NULL CHECK (category IN ('housing', 'buy_sell', 'recommendations')),
  visibility text NOT NULL CHECK (visibility IN ('company', 'all')),
  image_url text,
  is_flagged boolean DEFAULT false,
  flag_reasons text[] DEFAULT '{}',
  is_removed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================
-- Comments
-- ===============================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  is_removed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ===============================
-- Reports
-- ===============================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT report_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- ===============================
-- Indexes
-- ===============================
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ===============================
-- RLS Enablement
-- ===============================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- email_otps is SERVICE ROLE ONLY
-- (no RLS policies added intentionally)

-- ===============================
-- RLS Policies
-- ===============================

-- Companies: readable by authenticated users
CREATE POLICY "companies_select"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Users: view verified & active users
CREATE POLICY "users_select_verified"
  ON users FOR SELECT
  TO authenticated
  USING (is_verified = true AND is_active = true);

-- Users: update own profile
CREATE POLICY "users_update_self"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts: visibility rules
CREATE POLICY "posts_select_visibility"
  ON posts FOR SELECT
  TO authenticated
  USING (
    is_removed = false AND (
      visibility = 'all' OR
      (
        visibility = 'company' AND user_id IN (
          SELECT u1.id
          FROM users u1
          WHERE u1.company_id = (
            SELECT u2.company_id FROM users u2 WHERE u2.id = auth.uid()
          )
        )
      )
    )
  );

-- Posts: insert by verified & onboarded users
CREATE POLICY "posts_insert_verified"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_verified = true
        AND is_active = true
        AND onboarded = true
    )
  );

-- Posts: update/delete own
CREATE POLICY "posts_update_self"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete_self"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments: view on visible posts
CREATE POLICY "comments_select_visible"
  ON comments FOR SELECT
  TO authenticated
  USING (
    is_removed = false AND
    post_id IN (SELECT id FROM posts WHERE is_removed = false)
  );

-- Comments: insert by verified users
CREATE POLICY "comments_insert_verified"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND is_verified = true
        AND is_active = true
    )
  );

-- Comments: update/delete own
CREATE POLICY "comments_update_self"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_self"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reports: create by any authenticated user
CREATE POLICY "reports_insert"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Reports: admin-only access
CREATE POLICY "reports_admin_select"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "reports_admin_update"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- ===============================
-- updated_at Trigger
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- Auto-flagging Posts
-- ===============================
CREATE OR REPLACE FUNCTION auto_flag_post()
RETURNS TRIGGER AS $$
DECLARE
  flagged boolean := false;
  reasons text[] := '{}';
BEGIN
  IF NEW.text ~* '\d{10}' OR NEW.text ~* '\d{3}[-.\s]?\d{3}[-.\s]?\d{4}' THEN
    flagged := true;
    reasons := array_append(reasons, 'Contains phone number');
  END IF;

  IF NEW.text ~* '\y(broker|commission|brokerage|deal|urgent|limited offer|100% guaranteed)\y' THEN
    flagged := true;
    reasons := array_append(reasons, 'Contains broker-like keywords');
  END IF;

  NEW.is_flagged := flagged;
  NEW.flag_reasons := reasons;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_flag_post_trigger
  BEFORE INSERT OR UPDATE OF text ON posts
  FOR EACH ROW EXECUTE FUNCTION auto_flag_post();
