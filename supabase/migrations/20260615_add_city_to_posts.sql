-- 1. Add city column to public.posts table (defaulting to NULL representing global posts)
ALTER TABLE public.posts ADD COLUMN city text;

-- 2. Backfill existing posts using the author's city (fallback to NULL if author's city is 'All Cities' or null)
UPDATE public.posts p
SET city = CASE 
  WHEN u.city = 'All Cities' THEN NULL 
  ELSE u.city 
END
FROM public.users u
WHERE p.user_id = u.id;

-- 3. Recreate RLS policies on public.posts to support global visibility checks
DROP POLICY IF EXISTS posts_location_and_company_isolation ON public.posts;
DROP POLICY IF EXISTS vouchins_tiered_feed_access ON public.posts;
DROP POLICY IF EXISTS vouchins_tiered_visibility_access ON public.posts;

CREATE POLICY "posts_location_and_company_isolation" ON "public"."posts" FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM public.users viewer
    WHERE viewer.id = auth.uid()
      AND (
        posts.city IS NULL 
        OR posts.city = 'All Cities'::text 
        OR viewer.city IS NULL 
        OR viewer.city = 'All Cities'::text 
        OR posts.city = viewer.city
      )
      AND (
        posts.visibility = 'all'::text 
        OR (posts.visibility = 'company'::text AND (
          SELECT company_id FROM public.users author WHERE author.id = posts.user_id
        ) = viewer.company_id)
      )
  ))
);

CREATE POLICY "vouchins_tiered_feed_access" ON "public"."posts" FOR SELECT TO "authenticated" USING (
  (posts.visibility = 'all'::text AND (
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) = 'All Cities'::text OR
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) IS NULL OR
    posts.city = 'All Cities'::text OR
    posts.city IS NULL OR
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) = posts.city
  )) OR
  (posts.visibility = 'verified'::text AND (
    (SELECT users.is_verified FROM public.users WHERE users.id = auth.uid()) = true
  )) OR
  (posts.visibility = 'company'::text AND (
    (SELECT users.is_verified FROM public.users WHERE users.id = auth.uid()) = true
  ) AND (
    (SELECT users.company_id FROM public.users WHERE users.id = auth.uid()) = (
      SELECT users.company_id FROM public.users WHERE users.id = posts.user_id
    )
  ))
);

CREATE POLICY "vouchins_tiered_visibility_access" ON "public"."posts" FOR SELECT TO "authenticated" USING (
  (posts.visibility = 'all'::text AND (
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) = 'All Cities'::text OR
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) IS NULL OR
    posts.city = 'All Cities'::text OR
    posts.city IS NULL OR
    (SELECT users.city FROM public.users WHERE users.id = auth.uid()) = posts.city
  )) OR
  (posts.visibility = 'verified'::text AND (
    (SELECT users.is_verified FROM public.users WHERE users.id = auth.uid()) = true
  )) OR
  (posts.visibility = 'company'::text AND (
    (SELECT users.is_verified FROM public.users WHERE users.id = auth.uid()) = true
  ) AND (
    (SELECT users.company_id FROM public.users WHERE users.id = auth.uid()) = (
      SELECT users.company_id FROM public.users WHERE users.id = posts.user_id
    )
  ))
);
