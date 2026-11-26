-- ============================================================================
-- Migration: Unified Entitlement & Quota Ledger
-- Date: 2026-11-26
-- ============================================================================

-- 1. Meter Table
CREATE TABLE IF NOT EXISTS public.user_feature_usage (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  period_key text NOT NULL,
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_key, period_key)
);

ALTER TABLE public.user_feature_usage ENABLE ROW LEVEL SECURITY;

-- 2. Append-Only Audit & Idempotency Ledger
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  period_key text NOT NULL,
  request_id text NOT NULL,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL DEFAULT 'consume',
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'completed', 'refunded')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usage_events_user_feature_req_delta UNIQUE (user_id, feature_key, request_id, delta)
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON public.usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_events_pending_reconcile
  ON public.usage_events (outcome, created_at)
  WHERE outcome = 'pending' AND delta = 1;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- 3. Idempotent Backfill for Existing Users' Lifetime Resume Uploads
INSERT INTO public.user_feature_usage (user_id, feature_key, period_key, used_count, updated_at)
SELECT
  r.user_id,
  'resume_upload',
  'lifetime',
  COUNT(*)::integer,
  now()
FROM public.job_resumes r
GROUP BY r.user_id
ON CONFLICT (user_id, feature_key, period_key)
DO UPDATE SET
  used_count = GREATEST(public.user_feature_usage.used_count, EXCLUDED.used_count),
  updated_at = now();

-- 4. Atomic Single-Gate Consume RPC (Event-First Idempotency)
CREATE OR REPLACE FUNCTION public.consume_user_quota(
  p_user_id uuid,
  p_feature_key text,
  p_period_key text,
  p_limit integer,
  p_request_id text
)
RETURNS TABLE (
  allowed boolean,
  duplicate boolean,
  used integer,
  remaining integer,
  existing_outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_used integer;
  v_outcome text;
BEGIN
  IF p_limit <= 0 THEN
    RETURN QUERY SELECT false, false, 0, 0, NULL::text;
    RETURN;
  END IF;

  -- Event-first idempotency guard
  INSERT INTO public.usage_events (user_id, feature_key, period_key, request_id, delta, reason, outcome)
  VALUES (p_user_id, p_feature_key, p_period_key, p_request_id, 1, 'consume', 'pending')
  ON CONFLICT (user_id, feature_key, request_id, delta) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT e.outcome INTO v_outcome
    FROM public.usage_events e
    WHERE e.user_id = p_user_id
      AND e.feature_key = p_feature_key
      AND e.request_id = p_request_id
      AND e.delta = 1;

    SELECT f.used_count INTO v_used
    FROM public.user_feature_usage f
    WHERE f.user_id = p_user_id
      AND f.feature_key = p_feature_key
      AND f.period_key = p_period_key;

    RETURN QUERY SELECT false, true, COALESCE(v_used, 0), GREATEST(0, p_limit - COALESCE(v_used, 0)), v_outcome;
    RETURN;
  END IF;

  INSERT INTO public.user_feature_usage AS u (user_id, feature_key, period_key, used_count, updated_at)
  VALUES (p_user_id, p_feature_key, p_period_key, 1, now())
  ON CONFLICT (user_id, feature_key, period_key)
  DO UPDATE SET
    used_count = u.used_count + 1,
    updated_at = now()
  WHERE u.used_count < p_limit
  RETURNING u.used_count INTO v_used;

  IF FOUND THEN
    RETURN QUERY SELECT true, false, v_used, p_limit - v_used, 'pending'::text;
  ELSE
    DELETE FROM public.usage_events WHERE id = v_event_id;
    SELECT f.used_count INTO v_used
    FROM public.user_feature_usage f
    WHERE f.user_id = p_user_id
      AND f.feature_key = p_feature_key
      AND f.period_key = p_period_key;

    RETURN QUERY SELECT false, false, COALESCE(v_used, 0), 0, NULL::text;
  END IF;
END;
$$;

-- 5. Atomic Multi-Gate Consume RPC (All-or-Nothing Transaction)
CREATE OR REPLACE FUNCTION public.consume_user_quotas(
  p_user_id uuid,
  p_items jsonb,
  p_request_id text
)
RETURNS TABLE (
  allowed boolean,
  duplicate boolean,
  denied_feature text,
  used integer,
  remaining integer,
  existing_outcome text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_res record;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_res
    FROM public.consume_user_quota(
      p_user_id,
      v_item->>'feature_key',
      v_item->>'period_key',
      (v_item->>'limit')::integer,
      p_request_id
    );

    IF NOT v_res.allowed THEN
      -- Force transaction rollback of any earlier items in this loop via exception block
      RAISE EXCEPTION 'QUOTA_GATE_DENIED|%|%|%|%|%',
        v_item->>'feature_key',
        v_res.duplicate,
        v_res.used,
        v_res.remaining,
        COALESCE(v_res.existing_outcome, '');
    END IF;
  END LOOP;

  RETURN QUERY SELECT true, false, NULL::text, 0, 0, 'pending'::text;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE 'QUOTA_GATE_DENIED|%' THEN
      DECLARE
        v_parts text[] := string_to_array(SQLERRM, '|');
      BEGIN
        RETURN QUERY SELECT
          false,
          (v_parts[3] = 't' OR v_parts[3] = 'true'),
          v_parts[2],
          v_parts[4]::integer,
          v_parts[5]::integer,
          NULLIF(v_parts[6], '');
        RETURN;
      END;
    END IF;
    RAISE;
END;
$$;

-- 6. Strict State-Machine Refund RPC (Requires outcome = 'pending')
CREATE OR REPLACE FUNCTION public.refund_user_quota(
  p_user_id uuid,
  p_feature_key text,
  p_request_id text,
  p_reason text DEFAULT 'infra_error',
  p_max_refunds_per_period integer DEFAULT 5
)
RETURNS TABLE (refunded boolean, used integer, refund_reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig_id uuid;
  v_period_key text;
  v_orig_outcome text;
  v_refund_count integer;
  v_refund_event_id uuid;
  v_new_used integer;
BEGIN
  SELECT e.id, e.period_key, e.outcome
  INTO v_orig_id, v_period_key, v_orig_outcome
  FROM public.usage_events e
  WHERE e.user_id = p_user_id
    AND e.feature_key = p_feature_key
    AND e.request_id = p_request_id
    AND e.delta = 1
  FOR UPDATE;

  IF v_orig_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'original_event_not_found'::text;
    RETURN;
  END IF;

  IF v_orig_outcome <> 'pending' THEN
    SELECT f.used_count INTO v_new_used
    FROM public.user_feature_usage f
    WHERE f.user_id = p_user_id AND f.feature_key = p_feature_key AND f.period_key = v_period_key;
    RETURN QUERY SELECT false, COALESCE(v_new_used, 0), ('already_' || v_orig_outcome)::text;
    RETURN;
  END IF;

  -- Serialize refund cap check per (user, feature, period)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_feature_key || ':' || v_period_key));

  IF p_reason <> 'gate_denied' THEN
    SELECT COUNT(*)::integer INTO v_refund_count
    FROM public.usage_events e
    WHERE e.user_id = p_user_id
      AND e.feature_key = p_feature_key
      AND e.period_key = v_period_key
      AND e.delta = -1
      AND e.reason <> 'gate_denied';

    IF v_refund_count >= p_max_refunds_per_period THEN
      RETURN QUERY SELECT false, 0, 'refund_cap_reached'::text;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.usage_events (user_id, feature_key, period_key, request_id, delta, reason, outcome, completed_at)
  VALUES (p_user_id, p_feature_key, v_period_key, p_request_id, -1, p_reason, 'refunded', now())
  ON CONFLICT (user_id, feature_key, request_id, delta) DO NOTHING
  RETURNING id INTO v_refund_event_id;

  IF v_refund_event_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'already_refunded'::text;
    RETURN;
  END IF;

  UPDATE public.usage_events
  SET outcome = 'refunded', completed_at = now()
  WHERE id = v_orig_id;

  UPDATE public.user_feature_usage
  SET used_count = GREATEST(0, used_count - 1), updated_at = now()
  WHERE user_id = p_user_id AND feature_key = p_feature_key AND period_key = v_period_key
  RETURNING used_count INTO v_new_used;

  RETURN QUERY SELECT true, COALESCE(v_new_used, 0), p_reason;
END;
$$;

-- 7. Mark Pending Event Completed (No-op if not pending)
CREATE OR REPLACE FUNCTION public.mark_usage_event_completed(
  p_user_id uuid,
  p_feature_key text,
  p_request_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.usage_events
  SET outcome = 'completed', completed_at = now()
  WHERE user_id = p_user_id
    AND feature_key = p_feature_key
    AND request_id = p_request_id
    AND delta = 1
    AND outcome = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- 8. Service-Only Admin Quota Adjustment (Negative delta = grant, Positive = debit)
CREATE OR REPLACE FUNCTION public.admin_adjust_user_quota(
  p_user_id uuid,
  p_feature_key text,
  p_period_key text,
  p_delta integer,
  p_request_id text,
  p_reason text,
  p_admin_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_used integer;
BEGIN
  IF p_delta = 0 THEN
    SELECT used_count INTO v_new_used
    FROM public.user_feature_usage
    WHERE user_id = p_user_id AND feature_key = p_feature_key AND period_key = p_period_key;
    RETURN COALESCE(v_new_used, 0);
  END IF;

  INSERT INTO public.usage_events (user_id, feature_key, period_key, request_id, delta, reason, outcome, completed_at)
  VALUES (
    p_user_id,
    p_feature_key,
    p_period_key,
    p_request_id,
    p_delta,
    'admin:' || p_admin_user_id::text || ':' || COALESCE(p_reason, 'adjustment'),
    'completed',
    now()
  );

  INSERT INTO public.user_feature_usage (user_id, feature_key, period_key, used_count, updated_at)
  VALUES (p_user_id, p_feature_key, p_period_key, GREATEST(0, p_delta), now())
  ON CONFLICT (user_id, feature_key, period_key)
  DO UPDATE SET
    used_count = GREATEST(0, public.user_feature_usage.used_count + p_delta),
    updated_at = now()
  RETURNING used_count INTO v_new_used;

  RETURN v_new_used;
END;
$$;

-- 9. Lock Down All RPCs to service_role Only
REVOKE ALL ON FUNCTION public.consume_user_quota(uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_quota(uuid, text, text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.consume_user_quotas(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_user_quotas(uuid, jsonb, text) TO service_role;

REVOKE ALL ON FUNCTION public.refund_user_quota(uuid, text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_user_quota(uuid, text, text, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.mark_usage_event_completed(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_usage_event_completed(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.admin_adjust_user_quota(uuid, text, text, integer, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_quota(uuid, text, text, integer, text, text, uuid) TO service_role;
