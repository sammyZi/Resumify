-- =============================================================================
-- Migration: 20240101000001_rls_and_storage
-- Enables Row-Level Security on all user-owned tables and creates the private
-- storage bucket for generated PDFs and template preview assets.
--
-- Requirements: 10.1, 10.2, 7.2
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles RLS
-- Users can read and modify only their own profile row.
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "own_profile_modify" ON user_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- resumes RLS
-- Users can perform all operations only on their own resume rows.
-- -----------------------------------------------------------------------------
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_resumes_all" ON resumes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- shares RLS
-- Share rows are managed by their owner (the user who created them).
-- Anonymous share access is handled server-side via the service-role client,
-- which bypasses RLS but is constrained programmatically to the share record.
-- -----------------------------------------------------------------------------
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_shares_all" ON shares
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- templates RLS
-- Templates are public-read; no write access through the anon/user key.
-- -----------------------------------------------------------------------------
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_read" ON templates
  FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- Storage: private bucket for generated PDFs and template preview assets
--
-- The bucket is private (public=false); downloads are served via short-lived
-- signed URLs minted only after an ownership or share check passes.
-- File size limit: 50 MB. Allowed MIME types cover PDFs and image previews.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-assets',
  'resume-assets',
  false,
  52428800, -- 50 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Storage RLS: authenticated users can upload to their own folder
-- Files must be placed under a folder named by the user's UUID, e.g.:
--   resume-assets/<user-id>/resume-<id>.pdf
-- -----------------------------------------------------------------------------
CREATE POLICY "auth_upload_own" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resume-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- Storage RLS: authenticated users can read files in their own folder
-- -----------------------------------------------------------------------------
CREATE POLICY "auth_read_own" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resume-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Note: The service role bypasses RLS entirely, so no explicit service-role
-- storage policy is needed. The service-role client (lib/supabase/service.ts)
-- is used for share resolution and signed URL generation on behalf of visitors.
