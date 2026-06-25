/**
 * resume-store.ts — Resume_Store: persistence layer for Resume documents.
 *
 * Server-only module. Uses the cookie-bound Supabase client (anon key, RLS-enforced).
 *
 * Key behaviours:
 *  - createResume: creates a new resume, optionally pre-filled from a UserProfile
 *    snapshot. Pre-fill is a one-time copy — subsequent edits to the resume do
 *    NOT affect the stored profile.
 *  - saveResumeData: validates and persists Resume_Data fields for the resume only.
 *    Never touches the user_profiles table.
 *  - saveLatexSource / attachPdf: narrow updates for generated artefacts.
 *  - saveResumeDataToProfile: explicitly writes the current resume's Resume_Data
 *    back to the User_Profile (Req 11.7). This is the only path that mutates the
 *    profile from resume data.
 *
 * All functions return `Result<T, E>` — they never throw.
 *
 * Requirements: 5.2, 5.4, 5.7, 6.5, 6.6, 7.2, 11.4, 11.5, 11.6, 11.7
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateResumeData, type ValidationError } from '@/lib/validation'
import { ok, err, type Result, type AppError } from '@/lib/result'
import type { Resume, UserProfile, ResumeDataInput } from '@/lib/types'
import { saveProfile } from '@/lib/stores/profile-store'

// ─── Error union ──────────────────────────────────────────────────────────────

export type ResumeStoreError =
  | { kind: 'validation'; details: ValidationError }
  | { kind: 'not_found' }
  | { kind: 'db_error'; error: AppError }

// ─── Row shape returned by Supabase ──────────────────────────────────────────

type ResumeRow = {
  id: string
  user_id: string
  template_id: string | null
  full_name: string
  email: string
  experience: unknown
  education: unknown
  skills: unknown
  latex_source: string | null
  pdf_path: string | null
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    fullName: row.full_name,
    email: row.email,
    experience: row.experience as Resume['experience'],
    education: row.education as Resume['education'],
    skills: row.skills as Resume['skills'],
    latexSource: row.latex_source,
    pdfPath: row.pdf_path,
  }
}

// ─── createResume ─────────────────────────────────────────────────────────────

/**
 * Creates a new resume for `userId`.
 *
 * When `prefill` (a UserProfile snapshot) is provided, the new resume's
 * Resume_Data fields are populated from it — a shallow copy, not a reference.
 * Subsequent edits to the resume do NOT mutate the stored profile.
 *
 * When `prefill` is omitted, all Resume_Data fields are initialised to empty
 * values.
 *
 * `template` is the optional template UUID to associate at creation time.
 *
 * Requirements: 5.2, 11.4, 11.5
 */
export async function createResume(
  userId: string,
  prefill?: Pick<UserProfile, 'fullName' | 'email' | 'experience' | 'education' | 'skills'>,
  template?: string
): Promise<Result<Resume, ResumeStoreError>> {
  const supabase = await createSupabaseServerClient()

  const insertData = {
    user_id: userId,
    template_id: template ?? null,
    // Pre-fill from profile snapshot when provided; otherwise use empty defaults.
    full_name: prefill?.fullName ?? '',
    email: prefill?.email ?? '',
    experience: prefill?.experience ?? [],
    education: prefill?.education ?? [],
    skills: prefill?.skills ?? [],
    latex_source: null,
    pdf_path: null,
  }

  const { data, error } = await supabase
    .from('resumes')
    .insert(insertData)
    .select('*')
    .single()

  if (error) {
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToResume(data as ResumeRow))
}

// ─── getResume ────────────────────────────────────────────────────────────────

/**
 * Loads a single resume by `resumeId`.
 *
 * RLS ensures only the owner can read their own resumes.
 * Returns `not_found` when the row doesn't exist or is not accessible.
 *
 * Requirements: 5.4, 6.5
 */
export async function getResume(
  resumeId: string
): Promise<Result<Resume, ResumeStoreError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', resumeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return err({ kind: 'not_found' })
    }
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToResume(data as ResumeRow))
}

// ─── saveResumeData ───────────────────────────────────────────────────────────

/**
 * Validates `input` and updates the Resume_Data fields of an existing resume.
 *
 * This operation is resume-scoped only: it never touches `user_profiles`.
 * Validation runs before any DB call; on failure, the stored data is unchanged.
 *
 * Requirements: 5.4, 5.7, 11.6
 */
export async function saveResumeData(
  resumeId: string,
  input: ResumeDataInput
): Promise<Result<Resume, ResumeStoreError>> {
  // 1. Validate before touching the DB.
  const validation = validateResumeData(input)
  if (!validation.ok) {
    return err({ kind: 'validation', details: validation.error })
  }

  const data = validation.value

  const supabase = await createSupabaseServerClient()

  const { data: row, error } = await supabase
    .from('resumes')
    .update({
      full_name: data.fullName,
      email: data.email,
      experience: data.experience,
      education: data.education,
      skills: data.skills,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resumeId)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return err({ kind: 'not_found' })
    }
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToResume(row as ResumeRow))
}

// ─── saveLatexSource ──────────────────────────────────────────────────────────

/**
 * Persists the AI-generated LaTeX source for a resume.
 *
 * Called after a successful AI generation step. Does not touch Resume_Data.
 * On DB failure the returned error allows the caller to offer a retry.
 *
 * Requirements: 6.5, 6.6
 */
export async function saveLatexSource(
  resumeId: string,
  latexSource: string
): Promise<Result<Resume, ResumeStoreError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('resumes')
    .update({
      latex_source: latexSource,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resumeId)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return err({ kind: 'not_found' })
    }
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToResume(data as ResumeRow))
}

// ─── attachPdf ────────────────────────────────────────────────────────────────

/**
 * Records the Storage path of the compiled PDF for a resume.
 *
 * Called after a successful PDF compilation and upload. Does not touch
 * Resume_Data or LaTeX source.
 *
 * Requirements: 7.2
 */
export async function attachPdf(
  resumeId: string,
  pdfPath: string
): Promise<Result<Resume, ResumeStoreError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('resumes')
    .update({
      pdf_path: pdfPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resumeId)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return err({ kind: 'not_found' })
    }
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToResume(data as ResumeRow))
}

// ─── saveResumeDataToProfile ──────────────────────────────────────────────────

/**
 * Reads the current Resume_Data from `resumeId` and writes it back to the
 * stored User_Profile for `userId`.
 *
 * This is the ONLY sanctioned path for propagating resume edits back to the
 * profile. It must be triggered explicitly by the user; it is never called
 * automatically by `saveResumeData`.
 *
 * Returns the updated UserProfile on success.
 *
 * Requirements: 11.7
 */
export async function saveResumeDataToProfile(
  userId: string,
  resumeId: string
): Promise<Result<UserProfile, ResumeStoreError>> {
  // 1. Load the current resume.
  const resumeResult = await getResume(resumeId)
  if (!resumeResult.ok) {
    return resumeResult
  }

  const resume = resumeResult.value

  // 2. Extract Resume_Data fields and delegate to Profile_Store.
  //    saveProfile runs validation internally before persisting.
  const profileResult = await saveProfile(userId, {
    fullName: resume.fullName,
    email: resume.email,
    experience: resume.experience,
    education: resume.education,
    skills: resume.skills,
  })

  if (!profileResult.ok) {
    // Re-wrap the ProfileStoreError so the return type stays ResumeStoreError.
    const profileError = profileResult.error
    if (profileError.kind === 'validation') {
      return err({ kind: 'validation', details: profileError.details })
    }
    if (profileError.kind === 'not_found') {
      return err({ kind: 'not_found' })
    }
    return err(profileError)
  }

  return ok(profileResult.value)
}
