-- Vouchins reputation redesign.
-- Baseline note: public.vouches is captured in vouchins_schema.sql. The deployed
-- definitions of vouch_points, get_vouch_score and get_trust_signals could not be
-- introspected from this repository. Do not recreate those unknown definitions.

ALTER TABLE public.vouches
  ADD COLUMN IF NOT EXISTS profile_target_id uuid REFERENCES public.users(id);

UPDATE public.vouches
SET profile_target_id = target_user_id
WHERE is_profile_vouch IS TRUE AND profile_target_id IS NULL;

ALTER TABLE public.vouches DROP CONSTRAINT IF EXISTS vouches_not_self;
ALTER TABLE public.vouches ADD CONSTRAINT vouches_not_self
  CHECK (vouching_user_id <> target_user_id);
ALTER TABLE public.vouches DROP CONSTRAINT IF EXISTS vouches_one_entity;
ALTER TABLE public.vouches ADD CONSTRAINT vouches_one_entity
  CHECK (num_nonnulls(post_id, comment_id, profile_target_id) = 1);

CREATE OR REPLACE FUNCTION public.validate_vouch_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE resolved_target uuid;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT p.user_id INTO resolved_target FROM public.posts p
    WHERE p.id = NEW.post_id AND COALESCE(p.is_removed, false) = false;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT c.user_id INTO resolved_target FROM public.comments c
    WHERE c.id = NEW.comment_id AND COALESCE(c.is_removed, false) = false;
  ELSE
    resolved_target := NEW.profile_target_id;
  END IF;
  IF resolved_target IS NULL OR NEW.target_user_id IS DISTINCT FROM resolved_target THEN
    RAISE EXCEPTION 'vouch target does not own the referenced entity'
      USING ERRCODE = '23514';
  END IF;
  NEW.is_profile_vouch := NEW.profile_target_id IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_vouch_target_trigger ON public.vouches;
CREATE TRIGGER validate_vouch_target_trigger
BEFORE INSERT OR UPDATE ON public.vouches
FOR EACH ROW EXECUTE FUNCTION public.validate_vouch_target();

CREATE OR REPLACE FUNCTION public.get_unified_legacy_score(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.vouches v
  LEFT JOIN public.posts p ON p.id = v.post_id
  LEFT JOIN public.comments c ON c.id = v.comment_id
  WHERE v.target_user_id = p_user_id
    AND (v.post_id IS NULL OR COALESCE(p.is_removed, false) = false)
    AND (v.comment_id IS NULL OR COALESCE(c.is_removed, false) = false);
$$;
REVOKE ALL ON FUNCTION public.get_unified_legacy_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unified_legacy_score(uuid) TO authenticated, service_role;

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('vouch_points','get_vouch_score','get_trust_signals')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.signature);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.otp_attempts (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.otp_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('endorsement','legacy_import','reversal','expiry','outcome','admin_adjustment')),
  entity_type text CHECK (entity_type IS NULL OR entity_type IN ('post','comment','profile')),
  entity_id uuid,
  points_delta integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','reversed','expired')),
  scoring_version integer NOT NULL CHECK (scoring_version >= 0),
  idempotency_key text NOT NULL UNIQUE,
  reason_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_reason text,
  CHECK ((event_type NOT IN ('endorsement','legacy_import')) OR (entity_type IS NOT NULL AND entity_id IS NOT NULL)),
  CHECK (
    (event_type IN ('endorsement','legacy_import') AND points_delta BETWEEN 0 AND 3)
    OR (event_type = 'outcome' AND points_delta BETWEEN 0 AND 5)
    OR (event_type IN ('reversal','expiry','admin_adjustment') AND points_delta BETWEEN -100 AND 100)
  )
);
CREATE INDEX IF NOT EXISTS reputation_events_subject_status_idx ON public.reputation_events(subject_user_id, status);
CREATE INDEX IF NOT EXISTS reputation_events_actor_subject_idx ON public.reputation_events(actor_user_id, subject_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS reputation_active_endorsement_unique
  ON public.reputation_events(actor_user_id, subject_user_id, entity_type, entity_id)
  WHERE status = 'active' AND event_type IN ('endorsement','legacy_import');

CREATE TABLE IF NOT EXISTS public.user_reputation (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  independent_confidence_score integer NOT NULL DEFAULT 0 CHECK (independent_confidence_score BETWEEN 0 AND 45),
  outcome_score integer NOT NULL DEFAULT 0 CHECK (outcome_score BETWEEN 0 AND 35),
  contribution_score integer NOT NULL DEFAULT 0 CHECK (contribution_score BETWEEN 0 AND 20),
  total_score integer NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  level text NOT NULL DEFAULT 'new' CHECK (level IN ('new','building','established','highly_trusted')),
  distinct_endorser_count integer NOT NULL DEFAULT 0 CHECK (distinct_endorser_count >= 0),
  confirmed_outcome_count integer NOT NULL DEFAULT 0 CHECK (confirmed_outcome_count >= 0),
  scoring_version integer NOT NULL DEFAULT 1,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('work_otp','phone_otp','linkedin_url','manual_review','backfill')),
  evidence_class text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  UNIQUE(user_id, method, verified_at)
);
CREATE INDEX IF NOT EXISTS verification_events_user_method_idx ON public.verification_events(user_id, method);

CREATE OR REPLACE FUNCTION public.consume_email_otp(
  p_user_id uuid, p_email text, p_expected_hash text, p_company_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  DELETE FROM public.email_otps
  WHERE email=p_email AND otp_hash=p_expected_hash AND expires_at>now();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.users SET secondary_email=p_email, company_id=p_company_id,
    is_verified=true, onboarded=true, verification_method='otp'
  WHERE id=p_user_id;
  INSERT INTO public.verification_events(user_id,method,evidence_class)
  VALUES(p_user_id,'work_otp','otp_verified');
  DELETE FROM public.otp_attempts WHERE user_id=p_user_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_email_otp(uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_email_otp(uuid,text,text,uuid) TO service_role;

CREATE TABLE IF NOT EXISTS public.outcome_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  requester_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  helper_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outcome_type text NOT NULL CHECK (outcome_type IN ('referral','recommendation','housing','marketplace')),
  requester_confirmed_at timestamptz,
  helper_confirmed_at timestamptz,
  dispute_state text NOT NULL DEFAULT 'none' CHECK (dispute_state IN ('none','disputed','resolved')),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_user_id <> helper_user_id)
);
CREATE INDEX IF NOT EXISTS outcome_confirmations_helper_idx ON public.outcome_confirmations(helper_user_id);

CREATE TABLE IF NOT EXISTS public.reputation_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason_code text NOT NULL CHECK (length(trim(reason_code)) > 0),
  case_id text,
  reviewer_user_id uuid NOT NULL REFERENCES public.users(id),
  points_delta integer NOT NULL CHECK (points_delta BETWEEN -100 AND 100),
  expires_at timestamptz,
  appeal_status text NOT NULL DEFAULT 'none' CHECK (appeal_status IN ('none','pending','upheld','overturned')),
  moderation_status text NOT NULL DEFAULT 'upheld' CHECK (moderation_status = 'upheld'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  internal_only boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.feature_flags(key, enabled, internal_only)
VALUES ('reputation_display', false, true) ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated reputation read" ON public.user_reputation FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated flag read" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "participants read outcomes" ON public.outcome_confirmations FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_user_id, helper_user_id));

CREATE OR REPLACE FUNCTION public.recompute_user_reputation(p_user_id uuid)
RETURNS public.user_reputation
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE confidence integer; outcomes integer; contribution integer; endorsers integer; confirmed integer; total integer; result public.user_reputation;
BEGIN
  SELECT LEAST(45, COALESCE(sum(pair_points), 0)), count(*) INTO confidence, endorsers
  FROM (
    SELECT e.actor_user_id, LEAST(3, sum(e.points_delta))::integer pair_points
    FROM public.reputation_events e
    WHERE e.subject_user_id = p_user_id AND e.status = 'active'
      AND e.event_type IN ('endorsement','legacy_import') AND e.points_delta > 0
      AND EXISTS (SELECT 1 FROM public.verification_events v WHERE v.user_id=e.actor_user_id AND v.revoked_at IS NULL AND (v.expires_at IS NULL OR v.expires_at > now()))
    GROUP BY e.actor_user_id
  ) pairs;
  SELECT LEAST(35, 20, COALESCE(sum(5),0)), count(*) INTO outcomes, confirmed
  FROM public.outcome_confirmations o
  WHERE o.helper_user_id=p_user_id AND o.requester_confirmed_at IS NOT NULL
    AND o.helper_confirmed_at IS NOT NULL AND o.dispute_state <> 'disputed'
    AND o.created_at >= now() - interval '90 days';
  SELECT LEAST(20, 10, COALESCE(count(DISTINCT e.actor_user_id),0)) INTO contribution
  FROM public.reputation_events e
  WHERE e.subject_user_id=p_user_id AND e.status='active' AND e.entity_type='comment'
    AND e.created_at >= now() - interval '30 days' AND e.points_delta > 0;
  total := LEAST(100, confidence + outcomes + contribution);
  INSERT INTO public.user_reputation(user_id, independent_confidence_score, outcome_score, contribution_score, total_score, level, distinct_endorser_count, confirmed_outcome_count, scoring_version, calculated_at)
  VALUES (p_user_id, confidence, outcomes, contribution, total,
    CASE WHEN total >= 75 AND endorsers >= 10 AND confirmed >= 3 THEN 'highly_trusted'
         WHEN total >= 45 AND endorsers >= 5 THEN 'established'
         WHEN total >= 15 AND endorsers >= 2 THEN 'building' ELSE 'new' END,
    endorsers, confirmed, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    independent_confidence_score=EXCLUDED.independent_confidence_score, outcome_score=EXCLUDED.outcome_score,
    contribution_score=EXCLUDED.contribution_score, total_score=EXCLUDED.total_score, level=EXCLUDED.level,
    distinct_endorser_count=EXCLUDED.distinct_endorser_count, confirmed_outcome_count=EXCLUDED.confirmed_outcome_count,
    scoring_version=EXCLUDED.scoring_version, calculated_at=EXCLUDED.calculated_at
  RETURNING * INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_user_reputation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_user_reputation(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.create_vouch(p_entity_type text, p_entity_id uuid, p_endorsement_type text, p_reason text DEFAULT NULL)
RETURNS TABLE(event_id uuid, total_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor uuid := auth.uid(); target uuid; new_vouch uuid; new_event uuid; points integer; reputation public.user_reputation;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='28000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id=actor AND u.is_active=true AND u.is_verified=true) THEN
    RAISE EXCEPTION 'verified active account required' USING ERRCODE='42501';
  END IF;
  IF p_entity_type='post' THEN
    SELECT p.user_id INTO target FROM public.posts p WHERE p.id=p_entity_id AND COALESCE(p.is_removed,false)=false;
  ELSIF p_entity_type='comment' THEN
    SELECT c.user_id INTO target FROM public.comments c WHERE c.id=p_entity_id AND COALESCE(c.is_removed,false)=false;
  ELSIF p_entity_type='profile' THEN
    SELECT u.id INTO target FROM public.users u WHERE u.id=p_entity_id AND u.is_active=true;
  ELSE RAISE EXCEPTION 'invalid entity type' USING ERRCODE='22023';
  END IF;
  IF target IS NULL THEN RAISE EXCEPTION 'entity not found' USING ERRCODE='P0002'; END IF;
  IF target=actor THEN RAISE EXCEPTION 'self-vouch is not allowed' USING ERRCODE='23514'; END IF;
  IF (SELECT COALESCE(sum(points_delta),0) FROM public.reputation_events
      WHERE actor_user_id=actor AND subject_user_id=target AND status='active'
        AND created_at >= now()-interval '90 days') >= 3 THEN
    RAISE EXCEPTION 'actor-target cap reached' USING ERRCODE='23514';
  END IF;
  points := CASE WHEN p_endorsement_type='contextual' THEN 3 ELSE 1 END;
  INSERT INTO public.vouches(vouching_user_id,target_user_id,post_id,comment_id,profile_target_id,is_profile_vouch)
  VALUES(actor,target,CASE WHEN p_entity_type='post' THEN p_entity_id END,CASE WHEN p_entity_type='comment' THEN p_entity_id END,CASE WHEN p_entity_type='profile' THEN p_entity_id END,p_entity_type='profile')
  RETURNING id INTO new_vouch;
  INSERT INTO public.reputation_events(subject_user_id,actor_user_id,event_type,entity_type,entity_id,points_delta,status,scoring_version,idempotency_key,reason_code)
  VALUES(target,actor,'endorsement',p_entity_type,p_entity_id,points,'active',1,'vouch:'||new_vouch,p_reason) RETURNING id INTO new_event;
  SELECT * INTO reputation FROM public.recompute_user_reputation(target);
  RETURN QUERY SELECT new_event, reputation.total_score;
END;
$$;
REVOKE ALL ON FUNCTION public.create_vouch(text,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vouch(text,uuid,text,text) TO authenticated;
REVOKE INSERT, UPDATE ON public.vouches FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_outcome(p_outcome_id uuid, p_dispute boolean DEFAULT false)
RETURNS public.outcome_confirmations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); result public.outcome_confirmations;
BEGIN
  UPDATE public.outcome_confirmations SET
    requester_confirmed_at=CASE WHEN requester_user_id=actor AND NOT p_dispute THEN COALESCE(requester_confirmed_at,now()) ELSE requester_confirmed_at END,
    helper_confirmed_at=CASE WHEN helper_user_id=actor AND NOT p_dispute THEN COALESCE(helper_confirmed_at,now()) ELSE helper_confirmed_at END,
    dispute_state=CASE WHEN p_dispute THEN 'disputed' ELSE dispute_state END
  WHERE id=p_outcome_id AND actor IN (requester_user_id,helper_user_id) RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'outcome not found or forbidden' USING ERRCODE='42501'; END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.confirm_outcome(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_outcome(uuid,boolean) TO authenticated;

-- Legacy imports retain zero weight unless the actor is currently verified.
INSERT INTO public.reputation_events(subject_user_id,actor_user_id,event_type,entity_type,entity_id,points_delta,status,scoring_version,idempotency_key,reason_code,created_at)
SELECT v.target_user_id,v.vouching_user_id,'legacy_import',
  CASE WHEN v.post_id IS NOT NULL THEN 'post' WHEN v.comment_id IS NOT NULL THEN 'comment' ELSE 'profile' END,
  COALESCE(v.post_id,v.comment_id,v.profile_target_id,v.target_user_id),
  CASE WHEN u.is_verified THEN 1 ELSE 0 END,'active',0,'legacy-vouch:'||v.id,'backfill',v.created_at
FROM public.vouches v JOIN public.users u ON u.id=v.vouching_user_id
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.verification_events(user_id,method,evidence_class,verified_at)
SELECT u.id,'backfill',COALESCE(u.verification_method,'legacy_verified'),COALESCE(u.created_at,now())
FROM public.users u WHERE u.is_verified=true
ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW public.reputation_divergence_report AS
SELECT u.id AS user_id, public.get_unified_legacy_score(u.id) legacy_score,
  COALESCE(r.total_score,0) shadow_score,
  COALESCE(r.total_score,0)-public.get_unified_legacy_score(u.id) divergence
FROM public.users u LEFT JOIN public.user_reputation r ON r.user_id=u.id;
REVOKE ALL ON public.reputation_divergence_report FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.reputation_divergence_report TO service_role;
