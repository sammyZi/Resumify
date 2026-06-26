-- -----------------------------------------------------------------------------
-- 20240106000000_expand_certifications_schema.sql
--
-- Documents the expanded JSONB schema for the `certifications` column in both
-- `resumes` and `user_profiles` tables:
--
-- Old shape:
--   [{ "name": "...", "issuer": "...", "year": "..." }]
--
-- New expanded shape:
--   [{
--      "name": "...",       -- string <= 200 chars
--      "issuer": "...",     -- string <= 200 chars
--      "year": "...",       -- string <= 20 chars (legacy year or fallback)
--      "url": "...",        -- string <= 300 chars (verification link)
--      "issueDate": "...",  -- string <= 20 chars (e.g. YYYY-MM)
--      "expiryDate": "..."  -- string or null <= 20 chars (e.g. YYYY-MM or null)
--   }]
--
-- Since `certifications` is already stored as JSONB (`jsonb NOT NULL DEFAULT '[]'`),
-- no table structure alteration is required. This migration adds explicit column
-- comments in PostgreSQL to record the schema specification.
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN resumes.certifications IS 'Array of certification objects stored as JSONB: [{ name, issuer, year, url, issueDate, expiryDate }]';
COMMENT ON COLUMN user_profiles.certifications IS 'Array of certification objects stored as JSONB: [{ name, issuer, year, url, issueDate, expiryDate }]';
