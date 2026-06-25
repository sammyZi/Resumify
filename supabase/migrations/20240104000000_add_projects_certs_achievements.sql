-- -----------------------------------------------------------------------------
-- 20240104000000_add_projects_certs_achievements
--
-- Adds the remaining résumé sections to resumes and user_profiles:
--   projects        jsonb — [{ name, description, techStack[], liveUrl, repoUrl }]
--   certifications  jsonb — [{ name, issuer, year }]
--   achievements    jsonb — string[] (bulleted accomplishments)
--
-- Safe and idempotent to run on an existing database.
-- -----------------------------------------------------------------------------

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS projects       jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS achievements   jsonb NOT NULL DEFAULT '[]';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS projects       jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS achievements   jsonb NOT NULL DEFAULT '[]';
