-- First-party product and blog analytics.
-- Stores bounded daily aggregates rather than raw page-view events.

CREATE TABLE IF NOT EXISTS public.user_activity_daily (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  page_views integer NOT NULL DEFAULT 1 CHECK (page_views > 0),
  last_path text,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS user_activity_daily_date_idx
  ON public.user_activity_daily (activity_date DESC);

CREATE TABLE IF NOT EXISTS public.blog_view_daily (
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 1 CHECK (views >= 0),
  engaged boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  is_authenticated boolean NOT NULL DEFAULT false,
  referrer_host text,
  first_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  last_viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (blog_post_id, visitor_hash, view_date)
);

CREATE INDEX IF NOT EXISTS blog_view_daily_date_idx
  ON public.blog_view_daily (view_date DESC);
CREATE INDEX IF NOT EXISTS blog_view_daily_post_date_idx
  ON public.blog_view_daily (blog_post_id, view_date DESC);

ALTER TABLE public.user_activity_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_view_daily ENABLE ROW LEVEL SECURITY;

-- These tables are server-managed. Service-role requests bypass RLS.
REVOKE ALL ON public.user_activity_daily FROM anon, authenticated;
REVOKE ALL ON public.blog_view_daily FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_user_activity(
  p_user_id uuid,
  p_path text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_activity_daily (
    user_id,
    activity_date,
    first_seen_at,
    last_seen_at,
    page_views,
    last_path
  )
  SELECT
    p_user_id,
    CURRENT_DATE,
    now(),
    now(),
    1,
    left(p_path, 500)
  FROM public.users
  WHERE id = p_user_id
    AND is_active = true
    AND is_admin = false
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    last_seen_at = now(),
    page_views = public.user_activity_daily.page_views + 1,
    last_path = EXCLUDED.last_path;
$$;

CREATE OR REPLACE FUNCTION public.record_blog_activity(
  p_blog_post_id uuid,
  p_visitor_hash text,
  p_user_id uuid DEFAULT NULL,
  p_event_type text DEFAULT 'view',
  p_referrer_host text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_type NOT IN ('view', 'engaged', 'completed') THEN
    RAISE EXCEPTION 'Unsupported blog analytics event';
  END IF;

  INSERT INTO public.blog_view_daily (
    blog_post_id,
    visitor_hash,
    view_date,
    views,
    engaged,
    completed,
    is_authenticated,
    referrer_host,
    first_viewed_at,
    last_viewed_at
  )
  VALUES (
    p_blog_post_id,
    p_visitor_hash,
    CURRENT_DATE,
    CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
    p_event_type = 'engaged',
    p_event_type = 'completed',
    p_user_id IS NOT NULL,
    left(p_referrer_host, 255),
    now(),
    now()
  )
  ON CONFLICT (blog_post_id, visitor_hash, view_date)
  DO UPDATE SET
    views = public.blog_view_daily.views
      + CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
    engaged = public.blog_view_daily.engaged OR p_event_type = 'engaged',
    completed = public.blog_view_daily.completed OR p_event_type = 'completed',
    is_authenticated = public.blog_view_daily.is_authenticated OR p_user_id IS NOT NULL,
    referrer_host = COALESCE(public.blog_view_daily.referrer_host, EXCLUDED.referrer_host),
    last_viewed_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH settings AS (
    SELECT LEAST(GREATEST(p_days, 7), 90) AS days
  ),
  metrics AS (
    SELECT
      (SELECT count(*) FROM public.users WHERE is_active = true AND is_admin = false) AS total_users,
      (SELECT count(*) FROM public.users WHERE is_active = true AND is_admin = false AND is_verified = true) AS verified_users,
      (SELECT count(*) FROM public.users WHERE is_active = true AND is_admin = false AND created_at >= now() - interval '7 days') AS new_users_7d,
      (SELECT count(*) FROM public.user_activity_daily WHERE activity_date = CURRENT_DATE) AS dau,
      (SELECT count(DISTINCT user_id) FROM public.user_activity_daily WHERE activity_date >= CURRENT_DATE - 6) AS wau,
      (SELECT count(DISTINCT user_id) FROM public.user_activity_daily WHERE activity_date >= CURRENT_DATE - 29) AS mau,
      (SELECT count(*) FROM public.posts WHERE created_at >= now() - interval '30 days' AND is_removed = false) AS posts_30d,
      (SELECT count(*) FROM public.comments WHERE created_at >= now() - interval '30 days' AND is_removed = false) AS comments_30d,
      (SELECT count(*) FROM public.messages WHERE created_at >= now() - interval '30 days') AS messages_30d,
      (SELECT count(*) FROM public.vouches WHERE created_at >= now() - interval '30 days') AS vouches_30d
  ),
  dates AS (
    SELECT generate_series(
      CURRENT_DATE - ((SELECT days FROM settings) - 1),
      CURRENT_DATE,
      interval '1 day'
    )::date AS day
  ),
  trend AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', dates.day,
        'activeUsers', COALESCE(activity.active_users, 0),
        'pageViews', COALESCE(activity.page_views, 0)
      )
      ORDER BY dates.day
    ) AS points
    FROM dates
    LEFT JOIN (
      SELECT
        activity_date,
        count(*) AS active_users,
        sum(page_views) AS page_views
      FROM public.user_activity_daily
      WHERE activity_date >= CURRENT_DATE - ((SELECT days FROM settings) - 1)
      GROUP BY activity_date
    ) activity ON activity.activity_date = dates.day
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalUsers', total_users,
      'verifiedUsers', verified_users,
      'newUsers7d', new_users_7d,
      'dau', dau,
      'wau', wau,
      'mau', mau,
      'stickiness', CASE WHEN mau = 0 THEN 0 ELSE round((dau::numeric / mau) * 100, 1) END,
      'posts30d', posts_30d,
      'comments30d', comments_30d,
      'messages30d', messages_30d,
      'vouches30d', vouches_30d
    ),
    'trend', trend.points
  )
  FROM metrics, trend;
$$;

CREATE OR REPLACE FUNCTION public.get_blog_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH settings AS (
    SELECT LEAST(GREATEST(p_days, 7), 90) AS days
  ),
  post_metrics AS (
    SELECT
      bp.id,
      bp.title,
      bp.slug,
      bp.status,
      bp.published_at,
      COALESCE(sum(bv.views), 0) AS total_views,
      count(DISTINCT bv.visitor_hash) AS unique_readers,
      COALESCE(sum(bv.views) FILTER (WHERE bv.view_date >= CURRENT_DATE - 6), 0) AS views_7d,
      count(DISTINCT bv.visitor_hash) FILTER (WHERE bv.view_date >= CURRENT_DATE - 6) AS readers_7d,
      COALESCE(sum(bv.views) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29), 0) AS views_30d,
      count(DISTINCT bv.visitor_hash) FILTER (WHERE bv.view_date >= CURRENT_DATE - 29) AS readers_30d,
      count(DISTINCT bv.visitor_hash) FILTER (
        WHERE bv.view_date >= CURRENT_DATE - 29 AND bv.engaged = true
      ) AS engaged_30d,
      count(DISTINCT bv.visitor_hash) FILTER (
        WHERE bv.view_date >= CURRENT_DATE - 29 AND bv.completed = true
      ) AS completed_30d
    FROM public.blog_posts bp
    LEFT JOIN public.blog_view_daily bv ON bv.blog_post_id = bp.id
    GROUP BY bp.id
  ),
  dates AS (
    SELECT generate_series(
      CURRENT_DATE - ((SELECT days FROM settings) - 1),
      CURRENT_DATE,
      interval '1 day'
    )::date AS day
  ),
  trend AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', dates.day,
        'views', COALESCE(daily.views, 0),
        'readers', COALESCE(daily.readers, 0)
      )
      ORDER BY dates.day
    ) AS points
    FROM dates
    LEFT JOIN (
      SELECT
        view_date,
        sum(views) AS views,
        count(DISTINCT visitor_hash) AS readers
      FROM public.blog_view_daily
      WHERE view_date >= CURRENT_DATE - ((SELECT days FROM settings) - 1)
      GROUP BY view_date
    ) daily ON daily.view_date = dates.day
  ),
  totals AS (
    SELECT
      COALESCE(sum(views) FILTER (WHERE view_date >= CURRENT_DATE - 29), 0) AS views_30d,
      count(DISTINCT visitor_hash) FILTER (WHERE view_date >= CURRENT_DATE - 29) AS readers_30d,
      count(DISTINCT visitor_hash) FILTER (
        WHERE view_date >= CURRENT_DATE - 29 AND engaged = true
      ) AS engaged_30d,
      count(DISTINCT visitor_hash) FILTER (
        WHERE view_date >= CURRENT_DATE - 29 AND completed = true
      ) AS completed_30d
    FROM public.blog_view_daily
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'views30d', totals.views_30d,
      'readers30d', totals.readers_30d,
      'engagementRate', CASE
        WHEN totals.readers_30d = 0 THEN 0
        ELSE round((totals.engaged_30d::numeric / totals.readers_30d) * 100, 1)
      END,
      'completionRate', CASE
        WHEN totals.readers_30d = 0 THEN 0
        ELSE round((totals.completed_30d::numeric / totals.readers_30d) * 100, 1)
      END
    ),
    'posts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'slug', slug,
          'status', status,
          'publishedAt', published_at,
          'totalViews', total_views,
          'uniqueReaders', unique_readers,
          'views7d', views_7d,
          'readers7d', readers_7d,
          'views30d', views_30d,
          'readers30d', readers_30d,
          'engaged30d', engaged_30d,
          'completed30d', completed_30d,
          'engagementRate', CASE
            WHEN readers_30d = 0 THEN 0
            ELSE round((engaged_30d::numeric / readers_30d) * 100, 1)
          END,
          'completionRate', CASE
            WHEN readers_30d = 0 THEN 0
            ELSE round((completed_30d::numeric / readers_30d) * 100, 1)
          END
        )
        ORDER BY views_30d DESC, published_at DESC NULLS LAST
      )
      FROM post_metrics
    ), '[]'::jsonb),
    'trend', trend.points
  )
  FROM totals, trend;
$$;

REVOKE ALL ON FUNCTION public.record_user_activity(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_blog_activity(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_product_analytics(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_blog_analytics(integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_user_activity(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_blog_activity(uuid, text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_product_analytics(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_blog_analytics(integer) TO service_role;
