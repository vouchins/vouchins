-- Contact details are permitted in posts. Keep the abuse rejection rules, but
-- stop automatically flagging phone numbers and clear contact-only flags.

CREATE OR REPLACE FUNCTION public.auto_flag_post()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_removed IS DISTINCT FROM NEW.is_removed AND NEW.is_removed = true THEN
    RETURN NEW;
  END IF;

  IF NEW.text ~* '\y(bastard|bitch|asshole|idiot|stupid|gaali|chutiye|fuck|bahenchod|madarchod|harami|badawa|laude|kamine)\y' THEN
    RAISE EXCEPTION 'POST_REJECTED_ABUSE: Your post contains offensive language and cannot be published.';
  END IF;

  RETURN NEW;
END;
$$;

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

  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.text IS DISTINCT FROM NEW.text) THEN
    IF NEW.text ~* '\y(bastard|bitch|asshole|idiot|stupid|fuck|fucker|fucking|shit|bullshit|slut|whore|moron|dumb|retard|gaali|gali|chu|chutiya|chutiye|bc|mc|madarchod|behenchod|harami|haramzada|kamina|kamine|kutte|kutti|kutta|laude|loda|lund|gandu|bhosdike|bhosadi|randi|badawa|bewakoof|ullu|pagal|bakwas|jhatu|nalla|nikamma|lafanga|terrorist|jihadi|nazi|hitler|rape|rapist|molester|pedophile|paedophile|hate|kill|murder|die|go die)\y' THEN
      RAISE EXCEPTION 'POST_REJECTED_ABUSE: Your post contains offensive language and cannot be published.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.posts
SET
  is_flagged = false,
  flag_reasons = '{}'::text[]
WHERE is_flagged = true
  AND COALESCE(flag_reasons, '{}'::text[])
    <@ ARRAY['Safety Note: Contact number detected.']::text[];
