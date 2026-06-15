-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  company_id uuid,
  city text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_admin boolean DEFAULT false,
  onboarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  personal_email text,
  linkedin_url text,
  phone_number text,
  bio text,
  secondary_email text,
  verification_method text,
  id_card_url text,
  linkedin_verification_url text,
  visibility USER-DEFINED NOT NULL DEFAULT 'public'::profile_visibility,
  gender text,
  avatar_url text,
  last_seen timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['housing'::text, 'buy_sell'::text, 'recommendations'::text, 'jobs'::text])),
  visibility text NOT NULL CHECK (visibility = ANY (ARRAY['all'::text, 'verified'::text, 'company'::text])),
  is_flagged boolean DEFAULT false,
  flag_reasons ARRAY DEFAULT '{}'::text[],
  is_removed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sub_category text CHECK (sub_category = ANY (ARRAY['flatmates'::text, 'rentals'::text, 'sale'::text, 'pg'::text, 'hiring'::text, 'seeking_referral'::text, 'offering_referral'::text, 'seeking_job'::text])),
  image_urls ARRAY DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'closed'::text])),
  closed_at timestamp with time zone,
  closed_reason text,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  text text NOT NULL,
  is_removed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  post_id uuid,
  comment_id uuid,
  reason text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id),
  CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.email_otps (
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  last_sent_at timestamp with time zone,
  CONSTRAINT email_otps_pkey PRIMARY KEY (email)
);
CREATE TABLE public.signup_intents (
  email text NOT NULL,
  first_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  password text NOT NULL,
  CONSTRAINT signup_intents_pkey PRIMARY KEY (email)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  text text,
  created_at timestamp with time zone DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  is_delivered boolean DEFAULT false,
  encrypted_content text,
  encrypted_key_receiver text,
  encrypted_key_sender text,
  iv text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id)
);
CREATE TABLE public.otp_ip_rate_limits (
  ip text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  corporate_email text NOT NULL,
  personal_email text NOT NULL,
  linkedin_url text NOT NULL,
  city text NOT NULL,
  status USER-DEFINED DEFAULT 'pending'::waitlist_status,
  notes text,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);
CREATE TABLE public.manual_verification_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  corporate_email text,
  linkedin_url text,
  id_card_url text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  email text,
  reviewed_by uuid,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  CONSTRAINT manual_verification_requests_pkey PRIMARY KEY (id),
  CONSTRAINT manual_verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT manual_verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT feedback_pkey PRIMARY KEY (id)
);
CREATE TABLE public.advertisers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  billing_email text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT advertisers_pkey PRIMARY KEY (id),
  CONSTRAINT advertisers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  media_url text,
  target_url text NOT NULL,
  placement text NOT NULL CHECK (placement = ANY (ARRAY['inline'::text, 'left_sidebar'::text, 'right_sidebar'::text])),
  priority text NOT NULL CHECK (priority = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'PREMIUM'::text])),
  status text DEFAULT 'pending_payment'::text CHECK (status = ANY (ARRAY['pending_payment'::text, 'active'::text, 'paused'::text, 'expired'::text])),
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ads_pkey PRIMARY KEY (id),
  CONSTRAINT ads_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id)
);
CREATE TABLE public.ad_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL,
  ad_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  transaction_id text,
  payment_provider text CHECK (payment_provider = ANY (ARRAY['stripe'::text, 'razorpay'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ad_payments_pkey PRIMARY KEY (id),
  CONSTRAINT ad_payments_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES public.advertisers(id),
  CONSTRAINT ad_payments_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id)
);
CREATE TABLE public.ad_impressions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  user_id uuid,
  interaction_type text NOT NULL CHECK (interaction_type = ANY (ARRAY['view'::text, 'click'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ad_impressions_pkey PRIMARY KEY (id),
  CONSTRAINT ad_impressions_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id),
  CONSTRAINT ad_impressions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.specialists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  billing_email text NOT NULL,
  service_category text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT specialists_pkey PRIMARY KEY (id),
  CONSTRAINT specialists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.blog_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL,
  author_id uuid,
  cover_image_url text,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text])),
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
CREATE TABLE public.vouches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vouching_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  post_id uuid,
  comment_id uuid,
  is_profile_vouch boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vouches_pkey PRIMARY KEY (id),
  CONSTRAINT vouches_vouching_user_id_fkey FOREIGN KEY (vouching_user_id) REFERENCES public.users(id),
  CONSTRAINT vouches_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id),
  CONSTRAINT vouches_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT vouches_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id)
);
CREATE TABLE public.user_public_keys (
  user_id uuid NOT NULL,
  public_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  encrypted_private_key text,
  CONSTRAINT user_public_keys_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_public_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.recruiters (
  id uuid NOT NULL,
  company_name text NOT NULL,
  company_logo text,
  website text,
  billing_email text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recruiters_pkey PRIMARY KEY (id),
  CONSTRAINT recruiters_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  title text NOT NULL,
  company_name text NOT NULL,
  description text NOT NULL,
  requirements text,
  location text NOT NULL,
  job_type text NOT NULL CHECK (job_type = ANY (ARRAY['full-time'::text, 'part-time'::text, 'contract'::text, 'internship'::text])),
  salary_range text,
  experience_level text NOT NULL CHECK (experience_level = ANY (ARRAY['entry'::text, 'mid'::text, 'senior'::text, 'lead/director'::text])),
  category text NOT NULL,
  impressions integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  external_apply_url text,
  company_logo text,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.recruiters(id)
);
CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  resume_url text NOT NULL,
  cover_letter text,
  status text DEFAULT 'applied'::text CHECK (status = ANY (ARRAY['applied'::text, 'reviewing'::text, 'interviewing'::text, 'offered'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_applications_pkey PRIMARY KEY (id),
  CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.job_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_views_pkey PRIMARY KEY (id),
  CONSTRAINT job_views_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.saved_posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT saved_posts_pkey PRIMARY KEY (id),
  CONSTRAINT saved_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);