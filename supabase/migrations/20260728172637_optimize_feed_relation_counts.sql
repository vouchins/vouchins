-- The initial feed counts these relations for every returned post.
-- PostgreSQL does not automatically index foreign-key columns.
create index if not exists comments_post_count_idx
  on public.comments (post_id)
  where is_removed = false;

-- Some older environments created post_views outside the checked-in schema.
-- Keep fresh database setup working while indexing environments that have it.
do $$
begin
  if to_regclass('public.post_views') is not null then
    execute 'create index if not exists post_views_post_count_idx on public.post_views (post_id)';
  end if;
end
$$;
