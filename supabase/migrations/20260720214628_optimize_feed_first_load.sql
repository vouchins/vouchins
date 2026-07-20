create index if not exists posts_feed_visibility_created_idx
  on public.posts (visibility, created_at desc, id desc)
  where is_removed = false;
create index if not exists posts_feed_category_created_idx
  on public.posts (category, sub_category, created_at desc, id desc)
  where is_removed = false;
create index if not exists vouches_post_count_idx on public.vouches (post_id) where post_id is not null;
create index if not exists saved_posts_post_count_idx on public.saved_posts (post_id);
