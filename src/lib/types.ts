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

/** Supported social / profile link types (drives which icon is rendered). */
export type LinkType =
  | 'website'
  | 'linkedin'
  | 'github'
  | 'leetcode'
  | 'twitter'
  | 'dribbble'
  | 'medium'
  | 'other'

export type ResumeLink = {
  type: LinkType
  url: string // <= 300 chars
}

export type ProjectEntry = {
  name: string         // <= 200 chars
  description: string  // <= 2000 chars
  techStack: string[]  // technologies used, each <= 100 chars
  liveUrl: string      // <= 300 chars
  repoUrl: string      // <= 300 chars
}

export type CertificationEntry = {
  name: string    // <= 200 chars
  issuer: string  // <= 200 chars
  year: string    // <= 20 chars
}

// ─── Core data shape ─────────────────────────────────────────────────────

export type ResumeData = {
  fullName: string         // required, <= 200 chars
  email: string            // required, valid format, <= 254 chars
  phone: string            // optional, <= 50 chars
  location: string         // optional, <= 200 chars
  summary: string          // optional, <= 2000 chars
  links: ResumeLink[]      // <= 15 entries
  experience: ExperienceEntry[] // <= 50 entries
  projects: ProjectEntry[]      // <= 50 entries
  education: EducationEntry[]   // <= 50 entries
  certifications: CertificationEntry[] // <= 50 entries
  skills: string[]              // <= 50 entries, each <= 200 chars
  achievements: string[]        // <= 50 entries, each <= 500 chars
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
  /** One-line description of the look and feel. */
  description: string
  /** Accent color (CSS color) used by the rendered document. */
  accent: string
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

// ─── Share resolution types ───────────────────────────────────────────────

/**
 * Returned by ShareService.resolveShare on success.
 *
 * For recruiter shares: pdfPath is the PDF storage path (may be null if not yet compiled).
 * For template shares: templateId and latexScaffold carry the structural data.
 *
 * Resume_Data fields (fullName, email, experience, education, skills) are
 * intentionally absent — they are never exposed through a share.
 */
export type ResolvedShare = {
  share: Share
  /** Present for kind='recruiter' shares — the PDF storage path, or null if not yet compiled. */
  pdfPath: string | null
  /** Present for kind='template' shares — the template UUID. */
  templateId: string | null
  /** Present for kind='template' shares — the raw LaTeX scaffold string. */
  latexScaffold: string | null
  /** Present for kind='recruiter' shares — the full resume content to render. */
  resumeData: ResumeData | null
}

// ─── Store input types ────────────────────────────────────────────────────
// Used by ProfileStore and ResumeStore interfaces.
// Both accept the mutable ResumeData fields; server-managed fields
// (id, userId, updatedAt, etc.) are not part of the input.

/** Input shape for ResumeStore.saveResumeData */
export type ResumeDataInput = ResumeData

/** Input shape for ProfileStore.saveProfile */
export type UserProfileInput = ResumeData
