-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'COMMENT_RECEIVED', 'COMMENT_REPLY', 'POST_VOUCHED', 'MESSAGE_RECEIVED'
  entity_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'post', 'comment', 'message'
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false NOT NULL,
  read_at timestamp with time zone,
  email_sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_notification_activity UNIQUE (user_id, actor_id, type, entity_id)
);

-- 2. Add email preference and last digest sent columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pref_email_messages boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS pref_email_comments boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS pref_email_digest boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp with time zone;

-- 3. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read 
  ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_email_sent_at 
  ON public.notifications(email_sent_at) 
  WHERE email_sent_at IS NULL;

-- 4. Enable RLS and create policy
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can only access their own notifications'
  ) THEN
    CREATE POLICY "Users can only access their own notifications" ON public.notifications
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- 5. Create Trigger function to automatically insert notifications on activity
CREATE OR REPLACE FUNCTION public.handle_new_activity() 
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  meta jsonb;
BEGIN
  -- A. COMMENTS
  IF TG_TABLE_NAME = 'comments' THEN
    -- Check if it's a comment on a post
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
    meta := jsonb_build_object('post_id', NEW.post_id, 'text', substring(NEW.text from 1 for 100));

    -- Insert COMMENT_RECEIVED notification for post owner
    IF target_user_id IS NOT NULL AND target_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, entity_id, entity_type, metadata)
      VALUES (target_user_id, NEW.user_id, 'COMMENT_RECEIVED', NEW.id, 'comment', meta)
      ON CONFLICT (user_id, actor_id, type, entity_id) DO NOTHING;
    END IF;

    -- Insert COMMENT_REPLY notifications for previous commenters on that post
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id, entity_type, metadata)
    SELECT DISTINCT c.user_id, NEW.user_id, 'COMMENT_REPLY', NEW.id, 'comment', meta
    FROM public.comments c
    WHERE c.post_id = NEW.post_id 
      AND c.user_id != NEW.user_id 
      AND c.user_id != target_user_id
    ON CONFLICT (user_id, actor_id, type, entity_id) DO NOTHING;

  -- B. VOUCHES
  ELSIF TG_TABLE_NAME = 'vouches' THEN
    -- Only handle post vouches
    IF NEW.post_id IS NOT NULL THEN
      SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
      
      IF target_user_id IS NOT NULL AND target_user_id != NEW.vouching_user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, type, entity_id, entity_type, metadata)
        VALUES (
          target_user_id, 
          NEW.vouching_user_id, 
          'POST_VOUCHED', 
          NEW.post_id, 
          'post', 
          jsonb_build_object('post_id', NEW.post_id)
        )
        ON CONFLICT (user_id, actor_id, type, entity_id) DO NOTHING;
      END IF;
    END IF;

  -- C. MESSAGES
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF NEW.receiver_id IS NOT NULL AND NEW.sender_id != NEW.receiver_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, entity_id, entity_type, metadata)
      VALUES (
        NEW.receiver_id, 
        NEW.sender_id, 
        'MESSAGE_RECEIVED', 
        NEW.id, 
        'message', 
        jsonb_build_object('message_id', NEW.id)
      )
      ON CONFLICT (user_id, actor_id, type, entity_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Bind trigger functions to tables
DROP TRIGGER IF EXISTS trigger_comments_activity ON public.comments;
CREATE TRIGGER trigger_comments_activity
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();

DROP TRIGGER IF EXISTS trigger_vouches_activity ON public.vouches;
CREATE TRIGGER trigger_vouches_activity
AFTER INSERT ON public.vouches
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();

DROP TRIGGER IF EXISTS trigger_messages_activity ON public.messages;
CREATE TRIGGER trigger_messages_activity
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_activity();
