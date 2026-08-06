CREATE TABLE IF NOT EXISTS public.campaign_email_unsubscribes (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  unsubscribed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pref_email_campaigns boolean NOT NULL DEFAULT true;

ALTER TABLE public.campaign_email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Preference changes are only made by server routes after validating a signed link.
REVOKE ALL ON public.campaign_email_unsubscribes FROM anon, authenticated;
