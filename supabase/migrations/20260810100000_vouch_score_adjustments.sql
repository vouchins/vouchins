-- Track manual and report-driven vouch score changes.

CREATE TABLE IF NOT EXISTS public.vouch_score_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  delta integer NOT NULL,
  previous_score integer NOT NULL,
  new_score integer NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vouch_score_adjustments_source_check CHECK (
    source = ANY (ARRAY['manual'::text, 'report'::text])
  )
);

CREATE INDEX IF NOT EXISTS vouch_score_adjustments_user_id_idx
  ON public.vouch_score_adjustments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vouch_score_adjustments_report_id_idx
  ON public.vouch_score_adjustments (report_id)
  WHERE report_id IS NOT NULL;
