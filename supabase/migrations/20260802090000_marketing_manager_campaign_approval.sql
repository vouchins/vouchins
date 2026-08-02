-- Least-privilege marketing role and auditable campaign approval workflow.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_marketing_manager boolean NOT NULL DEFAULT false;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approval_email_error text,
  ADD COLUMN IF NOT EXISTS approval_version integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('draft', 'pending_approval', 'rejected', 'sending', 'sent', 'failed'));

CREATE TABLE IF NOT EXISTS public.campaign_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  version integer NOT NULL,
  action text NOT NULL CHECK (action IN ('submitted', 'withdrawn', 'approved', 'rejected', 'email_failed', 'email_retried')),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_approval_single_decision
  ON public.campaign_approval_events(campaign_id, version)
  WHERE action IN ('approved', 'rejected');

ALTER TABLE public.campaign_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Marketing managers manage own blog posts" ON public.blog_posts;
CREATE POLICY "Marketing managers manage own blog posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_marketing_manager
  ))
  WITH CHECK (author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_marketing_manager
  ));

-- Campaign writes are performed through server APIs so state transitions and
-- recipient privacy cannot be bypassed with a direct PostgREST request.
DROP POLICY IF EXISTS "Marketing managers manage own campaigns" ON public.campaigns;

CREATE OR REPLACE FUNCTION public.get_marketing_blog_analytics(
  p_author_id uuid, p_days integer DEFAULT 30
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin OR (is_marketing_manager AND id = p_author_id))) ok
  ), metrics AS (
    SELECT bp.id, bp.title, bp.slug, bp.status, bp.published_at,
      COALESCE(sum(bv.views),0) total_views,
      count(DISTINCT bv.visitor_hash) unique_readers,
      COALESCE(sum(bv.views) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29),0) views_30d,
      count(DISTINCT bv.visitor_hash) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29) readers_30d,
      count(DISTINCT bv.visitor_hash) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29 AND bv.engaged) engaged_30d,
      count(DISTINCT bv.visitor_hash) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29 AND bv.completed) completed_30d
    FROM blog_posts bp LEFT JOIN blog_view_daily bv ON bv.blog_post_id = bp.id, allowed
    WHERE allowed.ok AND bp.author_id = p_author_id GROUP BY bp.id
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'views30d', COALESCE(sum(views_30d),0),
      'readers30d', COALESCE(sum(readers_30d),0),
      'engagementRate', CASE WHEN COALESCE(sum(readers_30d),0)=0 THEN 0 ELSE round(sum(engaged_30d)::numeric/sum(readers_30d)*100,1) END,
      'completionRate', CASE WHEN COALESCE(sum(readers_30d),0)=0 THEN 0 ELSE round(sum(completed_30d)::numeric/sum(readers_30d)*100,1) END
    ),
    'posts', COALESCE(jsonb_agg(jsonb_build_object(
      'id',id,'title',title,'slug',slug,'status',status,'publishedAt',published_at,
      'totalViews',total_views,'uniqueReaders',unique_readers,'views30d',views_30d,'readers30d',readers_30d
    ) ORDER BY views_30d DESC), '[]'::jsonb)
  ) FROM metrics;
$$;
REVOKE ALL ON FUNCTION public.get_marketing_blog_analytics(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_marketing_blog_analytics(uuid, integer) TO authenticated, service_role;

-- Marketing managers may upload cover images. Object ownership prevents one
-- manager deleting another manager's image; admins retain their existing access.
DROP POLICY IF EXISTS "Marketing managers upload blog images" ON storage.objects;
CREATE POLICY "Marketing managers upload blog images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_marketing_manager
  ));
DROP POLICY IF EXISTS "Marketing managers update own blog images" ON storage.objects;
CREATE POLICY "Marketing managers update own blog images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND owner_id = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_marketing_manager
  ));
DROP POLICY IF EXISTS "Marketing managers delete own blog images" ON storage.objects;
CREATE POLICY "Marketing managers delete own blog images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND owner_id = auth.uid()::text AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_marketing_manager
  ));
