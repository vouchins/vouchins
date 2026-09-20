-- Add verification_reminder_sent_at to track 24-hour verification reminder emails
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS verification_reminder_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient cron querying
CREATE INDEX IF NOT EXISTS idx_users_verification_reminder
ON public.users (created_at)
WHERE is_verified = false AND verification_reminder_sent_at IS NULL;
