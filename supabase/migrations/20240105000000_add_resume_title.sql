-- -----------------------------------------------------------------------------
-- 20240105000000_add_resume_title
--
-- Adds a `title` column to resumes for a user-facing display name that is
-- independent of the person's full_name (ResumeData field).
--
-- Defaults to empty string — the application falls back to full_name when
-- title is empty so existing resumes continue to show correctly.
-- -----------------------------------------------------------------------------

ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
