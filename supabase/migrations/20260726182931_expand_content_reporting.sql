-- Expand reporting to users and add moderation audit fields.

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_user_id uuid,
  ADD COLUMN IF NOT EXISTS resolution_action text,
  ADD COLUMN IF NOT EXISTS resolution_notes text;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_user_id_fkey
  FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS report_target_check;
ALTER TABLE public.reports
  ADD CONSTRAINT report_target_check CHECK (
    num_nonnulls(post_id, comment_id, reported_user_id) = 1
  );

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_resolution_action_check;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_resolution_action_check CHECK (
    resolution_action IS NULL OR resolution_action = ANY (
      ARRAY[
        'none'::text,
        'content_removed'::text,
        'user_suspended'::text,
        'dismissed'::text
      ]
    )
  );

-- Preserve older duplicates while closing all but the earliest pending report.
WITH duplicates AS (
  SELECT id, row_number() OVER (
    PARTITION BY reporter_id, post_id ORDER BY created_at, id
  ) AS position
  FROM public.reports
  WHERE post_id IS NOT NULL AND status = 'pending'
)
UPDATE public.reports
SET
  status = 'dismissed',
  resolution_action = 'dismissed',
  resolution_notes = 'Automatically closed while consolidating duplicate pending reports.'
FROM duplicates
WHERE public.reports.id = duplicates.id AND duplicates.position > 1;

WITH duplicates AS (
  SELECT id, row_number() OVER (
    PARTITION BY reporter_id, comment_id ORDER BY created_at, id
  ) AS position
  FROM public.reports
  WHERE comment_id IS NOT NULL AND status = 'pending'
)
UPDATE public.reports
SET
  status = 'dismissed',
  resolution_action = 'dismissed',
  resolution_notes = 'Automatically closed while consolidating duplicate pending reports.'
FROM duplicates
WHERE public.reports.id = duplicates.id AND duplicates.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_post_unique
  ON public.reports (reporter_id, post_id)
  WHERE post_id IS NOT NULL AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_comment_unique
  ON public.reports (reporter_id, comment_id)
  WHERE comment_id IS NOT NULL AND status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_user_unique
  ON public.reports (reporter_id, reported_user_id)
  WHERE reported_user_id IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS reports_reported_user_id_idx
  ON public.reports (reported_user_id)
  WHERE reported_user_id IS NOT NULL;

-- New reports must pass through the validated server endpoint.
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
