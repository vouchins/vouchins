-- Compute profile/community score from peer vouches plus manual adjustments.

CREATE OR REPLACE FUNCTION public.get_vouch_score(profile_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE((SELECT count(*)::integer FROM public.vouches WHERE target_user_id = profile_id), 0)
    + COALESCE((SELECT sum(delta)::integer FROM public.vouch_score_adjustments WHERE user_id = profile_id), 0);
$$;
