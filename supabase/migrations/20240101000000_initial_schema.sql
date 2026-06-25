-- =============================================================================
-- Migration: 20240101000000_initial_schema
-- Creates the core tables for the AI Resume Builder.
--
-- Tables: user_profiles, templates, resumes, shares
-- Requirements: 5.2, 6.5, 7.2, 8.1, 11.1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_profiles
-- One-to-one with auth.users. Stores the reusable profile that can pre-fill
-- new resumes. JSON columns hold repeatable sections (experience/education/
-- skills) so the schema remains simple while the UI handles structure.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  email       text        NOT NULL DEFAULT '',
  experience  jsonb       NOT NULL DEFAULT '[]',
  education   jsonb       NOT NULL DEFAULT '[]',
  skills      jsonb       NOT NULL DEFAULT '[]',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- templates
-- Predefined role-based templates containing a LaTeX scaffold the AI targets.
-- Not user-owned; public-read via RLS policy in a later migration.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  role_category text        NOT NULL,
  preview_path  text        NOT NULL DEFAULT '',
  latex_scaffold text       NOT NULL DEFAULT '',
  is_default    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- resumes
-- Per-user resume documents. Mirrors the ResumeData shape plus template
-- association, generated LaTeX source, and stored PDF path.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   uuid        REFERENCES templates(id) ON DELETE SET NULL,
  full_name     text        NOT NULL DEFAULT '',
  email         text        NOT NULL DEFAULT '',
  experience    jsonb       NOT NULL DEFAULT '[]',
  education     jsonb       NOT NULL DEFAULT '[]',
  skills        jsonb       NOT NULL DEFAULT '[]',
  latex_source  text,
  pdf_path      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- shares
-- Share links keyed by opaque tokens. The `kind` column records the exact
-- access level ('recruiter' = PDF view/download; 'template' = copy structure).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id   uuid        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  kind        text        NOT NULL CHECK (kind IN ('recruiter', 'template')),
  revoked     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id        ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_token           ON shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_resume_id       ON shares(resume_id);
