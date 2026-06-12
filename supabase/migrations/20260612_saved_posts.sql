CREATE TABLE saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, post_id)
);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved posts" 
ON saved_posts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved posts" 
ON saved_posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved posts" 
ON saved_posts FOR DELETE 
USING (auth.uid() = user_id);
