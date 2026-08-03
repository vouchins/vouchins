-- Standalone, manually triggered content importer. Removing these two tables and
-- the content-importer application modules fully removes the feature.
CREATE TABLE public.content_import_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  url text NOT NULL UNIQUE,
  adapter text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  cursor jsonb,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.content_import_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  source_listing_url text NOT NULL,
  original_url text,
  title text NOT NULL,
  summary text NOT NULL,
  location text,
  city text,
  price_min numeric,
  price_max numeric,
  currency text,
  media_urls text[] NOT NULL DEFAULT '{}',
  accommodation_type text,
  furnishing text,
  bhk text,
  content_fingerprint text NOT NULL,
  source_published_at timestamptz,
  source_payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'publish_failed')),
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  published_post_id uuid REFERENCES public.posts(id),
  publish_error text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id)
);

CREATE UNIQUE INDEX content_import_items_original_url_unique
  ON public.content_import_items (original_url)
  WHERE original_url IS NOT NULL;
CREATE UNIQUE INDEX content_import_items_fingerprint_unique
  ON public.content_import_items (content_fingerprint);
CREATE INDEX content_import_items_source_idx ON public.content_import_items (source_id);
CREATE INDEX content_import_items_queue_idx
  ON public.content_import_items (status, source_published_at DESC, imported_at DESC);

ALTER TABLE public.content_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_import_sources_admin_all ON public.content_import_sources
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true AND is_active = true));

CREATE POLICY content_import_items_admin_all ON public.content_import_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true AND is_active = true));

-- The service-role API calls this after independently authenticating the admin.
-- The row lock and published_post_id check make repeat accepts idempotent.
CREATE OR REPLACE FUNCTION public.accept_content_import_item(
  p_item_id uuid,
  p_admin_id uuid,
  p_text text,
  p_sub_category text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.content_import_items%ROWTYPE;
  v_post_id uuid;
BEGIN
  SELECT * INTO v_item FROM public.content_import_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_ITEM_NOT_FOUND'; END IF;
  IF v_item.published_post_id IS NOT NULL THEN RETURN v_item.published_post_id; END IF;
  IF v_item.status NOT IN ('pending', 'publish_failed') THEN RAISE EXCEPTION 'IMPORT_ITEM_NOT_REVIEWABLE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_admin_id AND is_admin AND is_active) THEN
    RAISE EXCEPTION 'IMPORT_ADMIN_FORBIDDEN';
  END IF;

  INSERT INTO public.posts (user_id, text, category, sub_category, visibility, image_urls, city)
  VALUES (p_admin_id, p_text, 'housing', p_sub_category, 'all', v_item.media_urls, v_item.city)
  RETURNING id INTO v_post_id;

  UPDATE public.content_import_items SET status = 'accepted', reviewed_by = p_admin_id,
    reviewed_at = now(), published_post_id = v_post_id, publish_error = NULL, updated_at = now()
  WHERE id = p_item_id;
  RETURN v_post_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_content_import_item(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_content_import_item(uuid, uuid, text, text) TO service_role;
