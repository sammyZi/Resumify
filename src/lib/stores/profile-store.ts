/**
 * profile-store.ts — Profile_Store: persistence layer for User_Profile.
 *
 * Server-only module. Uses the cookie-bound Supabase client (anon key, RLS-enforced)
 * so all operations are automatically scoped to the authenticated user.
 *
 * All functions return `Result<T, E>` — they never throw.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.8, 11.9
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateResumeData, type ValidationError } from '@/lib/validation'
import { ok, err, type Result, type AppError } from '@/lib/result'
import type { UserProfile, UserProfileInput } from '@/lib/types'

// ─── Error union ──────────────────────────────────────────────────────────────

export type ProfileStoreError =
  | { kind: 'validation'; details: ValidationError }
  | { kind: 'not_found' }
  | { kind: 'db_error'; error: AppError }

// ─── Row shape returned by Supabase ──────────────────────────────────────────

type ProfileRow = {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  location: string | null
  summary: string | null
  links: unknown
  experience: unknown
  projects: unknown
  education: unknown
  certifications: unknown
  skills: unknown
  achievements: unknown
  updated_at: string
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    location: row.location ?? '',
    summary: row.summary ?? '',
    links: (row.links as UserProfile['links']) ?? [],
    experience: row.experience as UserProfile['experience'],
    projects: (row.projects as UserProfile['projects']) ?? [],
    education: row.education as UserProfile['education'],
    certifications: (row.certifications as UserProfile['certifications']) ?? [],
    skills: row.skills as UserProfile['skills'],
    achievements: (row.achievements as UserProfile['achievements']) ?? [],
    updatedAt: row.updated_at,
  }
}

// ─── getProfile ───────────────────────────────────────────────────────────────

/**
 * Loads the stored User_Profile for `userId`.
 *
 * Returns `not_found` when no profile row exists yet (first-time users).
 * Requirements: 11.1, 11.2
 */
export async function getProfile(
  userId: string
): Promise<Result<UserProfile, ProfileStoreError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // PostgREST returns code PGRST116 when .single() finds no rows.
    if (error.code === 'PGRST116') {
      return err({ kind: 'not_found' })
    }
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToProfile(data as ProfileRow))
}

// ─── saveProfile ──────────────────────────────────────────────────────────────

/**
 * Validates `input` and upserts the User_Profile for `userId`.
 *
 * Runs shared validation before any DB call. Returns a `validation` error
 * (with the complete set of failing fields) if validation fails.
 *
 * Uses INSERT … ON CONFLICT (user_id) DO UPDATE so the operation is
 * idempotent: first save creates the row; subsequent saves update it.
 *
 * Requirements: 11.1, 11.3, 11.8, 11.9
 */
export async function saveProfile(
  userId: string,
  input: UserProfileInput
): Promise<Result<UserProfile, ProfileStoreError>> {
  // 1. Validate before touching the DB.
  const validation = validateResumeData(input)
  if (!validation.ok) {
    return err({ kind: 'validation', details: validation.error })
  }

  const data = validation.value

  const supabase = await createSupabaseServerClient()

  const { data: row, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        summary: data.summary,
        links: data.links,
        experience: data.experience,
        projects: data.projects,
        education: data.education,
        certifications: data.certifications,
        skills: data.skills,
        achievements: data.achievements,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single()

  if (error) {
    return err({
      kind: 'db_error',
      error: { code: error.code ?? 'unknown', message: error.message },
    })
  }

  return ok(rowToProfile(row as ProfileRow))
}
