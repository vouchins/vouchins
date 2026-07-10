-- Migration: Campaign Management and User Groups
-- Created at: 2026-07-10

-- 1. Create user_groups table
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false NOT NULL,
  rules jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create user_group_members table for custom lists of users
CREATE TABLE IF NOT EXISTS public.user_group_members (
  group_id uuid REFERENCES public.user_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, user_id)
);

-- 3. Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['email'::text, 'notification'::text])),
  recipient_group_id text, -- Can be 'default_verified', 'default_all', etc. or a custom user group UUID
  recipient_group_name text NOT NULL,
  status text DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft'::text, 'sending'::text, 'sent'::text, 'failed'::text])),
  sent_count integer DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Enable RLS and create policy for user_groups
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on user_groups" ON public.user_groups;
CREATE POLICY "Admins can do everything on user_groups" ON public.user_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- 5. Enable RLS and create policy for user_group_members
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on user_group_members" ON public.user_group_members;
CREATE POLICY "Admins can do everything on user_group_members" ON public.user_group_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- 6. Enable RLS and create policy for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on campaigns" ON public.campaigns;
CREATE POLICY "Admins can do everything on campaigns" ON public.campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );
-- 7. Create user_identity_providers view for reading oauth identities
CREATE OR REPLACE VIEW public.user_identity_providers AS 
  SELECT id, user_id, provider, created_at 
  FROM auth.identities;
