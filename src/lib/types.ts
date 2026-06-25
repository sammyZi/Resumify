/**
 * types.ts — shared domain types for the AI Resume Builder.
 *
 * These types are pure TypeScript (no runtime dependencies) and are safe
 * to import from both server and client code.
 *
 * Requirements: 5.1, 11.1
 */

// ─── Sub-entry types ──────────────────────────────────────────────────────

export type ExperienceEntry = {
  title: string        // <= 200 chars
  organization: string // <= 200 chars
  startDate: string
  endDate: string | null
  description: string  // <= 2000 chars
}

export type EducationEntry = {
  institution: string  // <= 200 chars
  credential: string   // <= 200 chars
  startDate: string
  endDate: string | null
  description: string  // <= 2000 chars
}

// ─── Core data shape ─────────────────────────────────────────────────────

export type ResumeData = {
  fullName: string         // required, <= 200 chars
  email: string            // required, valid format, <= 254 chars
  experience: ExperienceEntry[] // <= 50 entries
  education: EducationEntry[]   // <= 50 entries
  skills: string[]              // <= 50 entries, each <= 200 chars
}

// ─── Persisted entities ───────────────────────────────────────────────────

export type UserProfile = ResumeData & {
  id: string
  userId: string
  updatedAt: string
}

export type Template = {
  id: string
  name: string
  roleCategory: string
  previewPath: string
  latexScaffold: string
  isDefault: boolean
}

export type Resume = ResumeData & {
  id: string
  userId: string
  templateId: string | null
  latexSource: string | null
  pdfPath: string | null
}

export type Share = {
  id: string
  resumeId: string
  ownerId: string
  token: string
  kind: 'recruiter' | 'template'
  revoked: boolean
}

// ─── Store input types ────────────────────────────────────────────────────
// Used by ProfileStore and ResumeStore interfaces.
// Both accept the mutable ResumeData fields; server-managed fields
// (id, userId, updatedAt, etc.) are not part of the input.

/** Input shape for ResumeStore.saveResumeData */
export type ResumeDataInput = ResumeData

/** Input shape for ProfileStore.saveProfile */
export type UserProfileInput = ResumeData
