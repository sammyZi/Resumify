-- -----------------------------------------------------------------------------
-- 20240102000000_drop_latex_template_text
--
-- Pivot away from DB-backed LaTeX templates toward code-based predefined
-- templates rendered to PDF in the browser.
--
-- The only schema change required by the app is making resumes.template_id a
-- plain TEXT slug (e.g. 'classic', 'modern') that references the in-code
-- template registry instead of the templates table.
--
--  1. Drop the FK constraint resumes.template_id -> templates(id).
--  2. Change resumes.template_id type from uuid to text.
--
-- Legacy columns (resumes.latex_source) and the templates table are left in
-- place — they are unused by the new flow but harmless, and keeping them avoids
-- touching the still-active share feature. Safe and idempotent to run.
-- -----------------------------------------------------------------------------

ALTER TABLE resumes
  DROP CONSTRAINT IF EXISTS resumes_template_id_fkey;

ALTER TABLE resumes
  ALTER COLUMN template_id TYPE text USING template_id::text;
