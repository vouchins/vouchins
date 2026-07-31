-- Public posts are discoverable across cities. City-specific feeds are an
-- application filter on posts.city; company visibility remains restricted.

DROP POLICY IF EXISTS "Users can only see posts in their city and authorized company"
  ON public.posts;
DROP POLICY IF EXISTS posts_location_and_company_isolation ON public.posts;
DROP POLICY IF EXISTS vouchins_tiered_feed_access ON public.posts;
DROP POLICY IF EXISTS vouchins_tiered_visibility_access ON public.posts;
DROP POLICY IF EXISTS posts_authenticated_visibility ON public.posts;

CREATE POLICY posts_authenticated_visibility
ON public.posts
FOR SELECT
TO authenticated
USING (
  visibility = 'all'
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
);
