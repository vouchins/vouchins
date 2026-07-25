-- Allow admins to clear an automatic flag without the unchanged post being
-- immediately flagged again. Content moderation still runs on inserts and
-- whenever the post text changes.

CREATE OR REPLACE FUNCTION public.handle_post_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_removed IS DISTINCT FROM NEW.is_removed AND NEW.is_removed = true THEN
      RETURN NEW;
    END IF;

    IF OLD.text IS NOT DISTINCT FROM NEW.text THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.text ~* '\d{10}' OR NEW.text ~* '\d{3}[-.\s]?\d{3}[-.\s]?\d{4}' THEN
    NEW.is_flagged := true;
    NEW.flag_reasons := array_append(
      COALESCE(NEW.flag_reasons, '{}'),
      'Safety Note: Contact number detected.'
    );
  END IF;

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.text IS DISTINCT FROM NEW.text) THEN
    IF NEW.text ~* '\y(bastard|bitch|asshole|idiot|stupid|fuck|fucker|fucking|shit|bullshit|slut|whore|moron|dumb|retard|gaali|gali|chu|chutiya|chutiye|bc|mc|madarchod|behenchod|harami|haramzada|kamina|kamine|kutte|kutti|kutta|laude|loda|lund|gandu|bhosdike|bhosadi|randi|badawa|bewakoof|ullu|pagal|bakwas|jhatu|nalla|nikamma|lafanga|terrorist|jihadi|nazi|hitler|rape|rapist|molester|pedophile|paedophile|hate|kill|murder|die|go die)\y' THEN
      RAISE EXCEPTION 'POST_REJECTED_ABUSE: Your post contains offensive language and cannot be published.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
