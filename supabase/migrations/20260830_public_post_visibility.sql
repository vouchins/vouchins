-- Migration: Add Public Post Visibility Support & Update RLS Policies
-- Public posts are discoverable and readable by unauthenticated visitors (anon) and authenticated members.

-- 1. Ensure posts check constraint allows 'public', 'all', 'company' (and legacy 'verified' if existing)
DO $$
BEGIN
  ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_visibility_check;
  ALTER TABLE public.posts ADD CONSTRAINT posts_visibility_check CHECK (visibility IN ('public', 'all', 'company', 'verified'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Drop existing visibility policy on public.posts
DROP POLICY IF EXISTS posts_authenticated_visibility ON public.posts;
DROP POLICY IF EXISTS posts_public_anon_visibility ON public.posts;

-- 3. Create authenticated user visibility policy
CREATE POLICY posts_authenticated_visibility
ON public.posts
FOR SELECT
TO authenticated
USING (
  (is_removed = false OR auth.uid() = user_id)
  AND (
    visibility IN ('all', 'public')
    OR (
      visibility = 'verified'
      AND EXISTS (
        SELECT 1
        FROM public.users viewer
        WHERE viewer.id = auth.uid()
          AND viewer.is_verified = true
          AND viewer.is_active = true
      )
    )
    OR (
      visibility = 'company'
      AND EXISTS (
        SELECT 1
        FROM public.users viewer
        JOIN public.users author ON author.id = posts.user_id
        WHERE viewer.id = auth.uid()
          AND viewer.is_verified = true
          AND viewer.is_active = true
          AND viewer.company_id = author.company_id
      )
    )
  )
);

-- 4. Create anon (unauthenticated) user visibility policy for public posts
CREATE POLICY posts_public_anon_visibility
ON public.posts
FOR SELECT
TO anon
USING (
  visibility = 'public'
  AND is_removed = false
  AND is_flagged = false
);
