-- -----------------------------------------------------------------------------
-- 20240103000000_add_contact_and_links
--
-- Adds richer contact + social/profile fields to resumes and user_profiles:
--   phone     text   — phone number
--   location  text   — city / region
--   summary   text   — professional summary / objective
--   links     jsonb  — [{ type, url }] social & profile links
--                      (website, linkedin, github, leetcode, twitter, ...)
--
-- Safe and idempotent to run on an existing database.
-- -----------------------------------------------------------------------------

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS phone    text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary  text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS links    jsonb NOT NULL DEFAULT '[]';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone    text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary  text  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS links    jsonb NOT NULL DEFAULT '[]';
