/*
  # Vouchins Database Schema

  ## Overview
  This migration creates the complete database schema for Vouchins, a trust-based 
  community platform for corporate employees.

  ## Tables Created
  
  1. **companies**
     - `id` (uuid, primary key)
     - `domain` (text, unique) - Corporate email domain (e.g., "google.com")
     - `name` (text) - Company name (e.g., "Google")
     - `created_at` (timestamptz)
     
  2. **users**
     - `id` (uuid, primary key) - Links to auth.users
     - `email` (text, unique)
     - `first_name` (text)
     - `company_id` (uuid, foreign key)
     - `city` (text)
     - `is_verified` (boolean) - Email verification status
     - `is_active` (boolean) - Account active status (for moderation)
     - `is_admin` (boolean) - Admin access
     - `onboarded` (boolean) - Has completed onboarding
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     
  3. **posts**
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key)
     - `text` (text, not null)
     - `category` (text) - "housing", "buy_sell", "recommendations"
     - `visibility` (text) - "company" or "all"
     - `image_url` (text, optional)
     - `is_flagged` (boolean) - Auto-flagged by system
     - `flag_reasons` (text array) - Reasons for flagging
     - `is_removed` (boolean) - Removed by admin
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     
  4. **comments**
     - `id` (uuid, primary key)
     - `post_id` (uuid, foreign key)
     - `user_id` (uuid, foreign key)
     - `text` (text, not null)
     - `is_removed` (boolean)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     
  5. **reports**
     - `id` (uuid, primary key)
     - `reporter_id` (uuid, foreign key)
     - `post_id` (uuid, foreign key, optional)
     - `comment_id` (uuid, foreign key, optional)
     - `reason` (text)
     - `status` (text) - "pending", "reviewed", "dismissed"
     - `reviewed_by` (uuid, foreign key, optional)
     - `reviewed_at` (timestamptz, optional)
     - `created_at` (timestamptz)
     
  ## Security
  - All tables have RLS enabled
  - Users can only see active, verified users
  - Posts visibility is enforced at database level
  - Only admins can access reports table
  
  ## Important Notes
  - Corporate emails only (no Gmail, Yahoo, etc.)
  - Email verification is mandatory before posting
  - Auto-flagging for phone numbers and broker keywords
  - Single-level comment threading only
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  city text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_admin boolean DEFAULT false,
  onboarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
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

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  is_removed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reports table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Companies policies (public read)
CREATE POLICY "Companies are viewable by everyone"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Users policies
CREATE POLICY "Users can view active verified users"
  ON users FOR SELECT
  TO authenticated
  USING (is_active = true AND is_verified = true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts policies
CREATE POLICY "Users can view posts based on visibility"
  ON posts FOR SELECT
  TO authenticated
  USING (
    is_removed = false AND
    (
      visibility = 'all' OR 
      (visibility = 'company' AND user_id IN (
        SELECT u1.id FROM users u1
        WHERE u1.company_id = (
          SELECT u2.company_id FROM users u2 WHERE u2.id = auth.uid()
        )
      ))
    )
  );

CREATE POLICY "Verified users can create posts"
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

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments on visible posts"
  ON comments FOR SELECT
  TO authenticated
  USING (
    is_removed = false AND
    post_id IN (
      SELECT id FROM posts 
      WHERE is_removed = false AND
      (
        visibility = 'all' OR 
        (visibility = 'company' AND user_id IN (
          SELECT u1.id FROM users u1
          WHERE u1.company_id = (
            SELECT u2.company_id FROM users u2 WHERE u2.id = auth.uid()
          )
        ))
      )
    )
  );

CREATE POLICY "Verified users can create comments"
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

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-flag posts with phone numbers or broker keywords
CREATE OR REPLACE FUNCTION auto_flag_post()
RETURNS TRIGGER AS $$
DECLARE
  flagged boolean := false;
  reasons text[] := '{}';
BEGIN
  -- Check for phone numbers (10 digits)
  IF NEW.text ~* '\d{10}' OR NEW.text ~* '\d{3}[-.\s]?\d{3}[-.\s]?\d{4}' THEN
    flagged := true;
    reasons := array_append(reasons, 'Contains phone number');
  END IF;
  
  -- Check for broker-like keywords
  IF NEW.text ~* '\y(broker|commission|brokerage|deal|urgent|limited offer|100% guaranteed)\y' THEN
    flagged := true;
    reasons := array_append(reasons, 'Contains broker-like keywords');
  END IF;
  
  NEW.is_flagged := flagged;
  NEW.flag_reasons := reasons;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-flagging posts
CREATE TRIGGER auto_flag_post_trigger BEFORE INSERT OR UPDATE OF text ON posts
  FOR EACH ROW EXECUTE FUNCTION auto_flag_post();