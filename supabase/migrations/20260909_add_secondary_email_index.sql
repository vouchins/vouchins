-- Add index for fast secondary_email lookup during verification
CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON public.users USING btree (secondary_email) WHERE secondary_email IS NOT NULL;
