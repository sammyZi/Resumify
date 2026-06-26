/**
 * share-service.ts — Share_Service: create, resolve, revoke, and copy shares.
 *
 * Server-only module. Uses:
 *  - service-role client (RLS-bypassing) for resolveShare and copyTemplateFromShare,
 *    where no user session is present.
 *  - session-bound client for createShare and revokeShare, where the caller's
 *    identity must be verified against the row's owner_id.
 *
 * Access level enforcement:
 *  - 'recruiter' shares expose only pdf_path for view/download — never Resume_Data.
 *  - 'template' shares expose only template_id and latex_scaffold — never Resume_Data.
 *
 * Token generation: crypto.getRandomValues (Web Crypto, available in Node.js 19+
 * and all Next.js edge/Node runtimes) produces 32 bytes → 64 hex chars.
 *
 * Requirements: 8.1, 8.2, 8.4, 8.6, 8.7, 10.3, 10.4, 10.5
 */

import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import type { ShareError } from '@/lib/result'
import type { Share, Resume, ResolvedShare } from '@/lib/types'

// ─── Token generation ─────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 64-character hex token using Web Crypto.
 * Available in Node.js 19+ and all Next.js runtimes (Node + Edge).
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Row shapes ───────────────────────────────────────────────────────────────

type ShareRow = {
  id: string
  resume_id: string
  owner_id: string
  token: string
  kind: 'recruiter' | 'template'
  revoked: boolean
}

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

// ─── Mappers ──────────────────────────────────────────────────────────────────

function rowToShare(row: ShareRow): Share {
  return {
    id: row.id,
    resumeId: row.resume_id,
    ownerId: row.owner_id,
    token: row.token,
    kind: row.kind,
    revoked: row.revoked,
  }
}

function rowToResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    fullName: row.full_name,
    email: row.email,
    phone: (row as { phone?: string | null }).phone ?? '',
    location: (row as { location?: string | null }).location ?? '',
    summary: (row as { summary?: string | null }).summary ?? '',
    links: ((row as { links?: unknown }).links as Resume['links']) ?? [],
    experience: row.experience as Resume['experience'],
    projects: ((row as { projects?: unknown }).projects as Resume['projects']) ?? [],
    education: row.education as Resume['education'],
    certifications: ((row as { certifications?: unknown }).certifications as Resume['certifications']) ?? [],
    skills: row.skills as Resume['skills'],
    achievements: ((row as { achievements?: unknown }).achievements as Resume['achievements']) ?? [],
    latexSource: row.latex_source,
    pdfPath: row.pdf_path,
    title: (row as { title?: string }).title ?? '',
  }
}

// ─── createShare ──────────────────────────────────────────────────────────────

/**
 * Creates a new share for `resumeId` owned by `userId`.
 *
 * Generates a high-entropy opaque token and inserts a row into the `shares`
 * table with revoked=false. The session-bound client is used so RLS verifies
 * the caller owns the resume transitively.
 *
 * Requirements: 8.1, 8.2
 */
export async function createShare(
  userId: string,
  resumeId: string,
  kind: 'recruiter' | 'template'
): Promise<Result<Share, ShareError>> {
  const supabase = await createSupabaseServerClient()
  const token = generateToken()

  const { data, error } = await supabase
    .from('shares')
    .insert({
      resume_id: resumeId,
      owner_id: userId,
      token,
      kind,
      revoked: false,
    })
    .select('*')
    .single()

  if (error) {
    return err({
      kind: 'not_found',
      message: error.message,
    })
  }

  return ok(rowToShare(data as ShareRow))
}

// ─── listSharesByResume ───────────────────────────────────────────────────────

/**
 * Lists all non-revoked shares for a resume owned by `userId`.
 * RLS ensures the caller only sees their own shares.
 */
export async function listSharesByResume(
  userId: string,
  resumeId: string
): Promise<Result<Share[], ShareError>> {
  const supabase = await createSupabaseServerClient()

  // No `.order()` — avoids any dependency on an optional column and keeps the
  // query resilient. The list is small; the client can sort if needed.
  const { data, error } = await supabase
    .from('shares')
    .select('id, resume_id, owner_id, token, kind, revoked')
    .eq('owner_id', userId)
    .eq('resume_id', resumeId)
    .eq('revoked', false)

  if (error) {
    return err({ kind: 'not_found', message: error.message })
  }

  return ok((data as ShareRow[]).map(rowToShare))
}

// ─── resolveShare ─────────────────────────────────────────────────────────────
/**
 * Resolves a share token to its associated share row and limited resume data.
 *
 * Uses the service-role client (bypasses RLS) because the resolver may be an
 * anonymous visitor who has no session. Access is constrained programmatically:
 *  - recruiter kind: returns pdf_path only (never Resume_Data).
 *  - template kind:  returns template_id + latex_scaffold only (never Resume_Data).
 *
 * Requirements: 8.6, 10.3, 10.4, 10.5
 */
export async function resolveShare(
  token: string
): Promise<Result<ResolvedShare, ShareError>> {
  const supabase = createSupabaseServiceClient()

  // 1. Look up the share row by token.
  const { data: shareData, error: shareError } = await supabase
    .from('shares')
    .select('*')
    .eq('token', token)
    .single()

  if (shareError || !shareData) {
    return err({
      kind: 'not_found',
      message: 'Share link not found.',
    })
  }

  const share = rowToShare(shareData as ShareRow)

  // 2. Deny revoked shares.
  if (share.revoked) {
    return err({
      kind: 'revoked',
      message: 'This share link has been revoked.',
    })
  }

  // 3. Fetch resume columns based on share kind.
  //    - recruiter: full resume content so the page can render the resume.
  //    - template:  only structural fields (never Resume_Data).
  const selectColumns =
    share.kind === 'recruiter'
      ? '*'
      : 'id, user_id, template_id, latex_source'

  const { data: resumeData, error: resumeError } = await supabase
    .from('resumes')
    .select(selectColumns)
    .eq('id', share.resumeId)
    .single()

  if (resumeError || !resumeData) {
    return err({
      kind: 'not_found',
      message: 'Associated resume not found.',
    })
  }

  // 4. Build ResolvedShare with only the access-level-appropriate fields.
  if (share.kind === 'recruiter') {
    const resume = rowToResume(resumeData as unknown as ResumeRow)
    return ok({
      share,
      pdfPath: resume.pdfPath,
      templateId: resume.templateId,
      latexScaffold: null,
      resumeData: {
        fullName: resume.fullName,
        email: resume.email,
        phone: resume.phone,
        location: resume.location,
        summary: resume.summary,
        links: resume.links,
        experience: resume.experience,
        projects: resume.projects,
        education: resume.education,
        certifications: resume.certifications,
        skills: resume.skills,
        achievements: resume.achievements,
      },
    })
  }

  const resume = resumeData as unknown as {
    id: string
    user_id: string
    template_id?: string | null
    latex_source?: string | null
  }

  // kind === 'template'
  return ok({
    share,
    pdfPath: null,
    templateId: resume.template_id ?? null,
    latexScaffold: resume.latex_source ?? null,
    resumeData: null,
  })
}

// ─── revokeShare ─────────────────────────────────────────────────────────────

/**
 * Sets revoked=true on the share row where id=shareId AND owner_id=userId.
 *
 * Uses the session-bound client so RLS further constrains the update to the
 * authenticated user's own rows.
 *
 * Requirements: 8.7
 */
export async function revokeShare(
  userId: string,
  shareId: string
): Promise<Result<void, ShareError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('shares')
    .update({ revoked: true })
    .eq('id', shareId)
    .eq('owner_id', userId)
    .select('id')
    .single()

  if (error || !data) {
    return err({
      kind: 'not_found',
      message: 'Share not found or you do not own it.',
    })
  }

  return ok(undefined)
}

// ─── copyTemplateFromShare ────────────────────────────────────────────────────

/**
 * Resolves a template share and creates a new resume for `intoUserId` that
 * carries only the template_id and latex_scaffold from the source resume.
 *
 * All Resume_Data fields (full_name, email, experience, education, skills) are
 * explicitly initialised to empty/null — the source owner's personal data is
 * never copied.
 *
 * Requirements: 8.4, 8.5, 10.3
 */
export async function copyTemplateFromShare(
  token: string,
  intoUserId: string
): Promise<Result<Resume, ShareError>> {
  // 1. Resolve the share (enforces non-revoked + kind='template').
  const resolved = await resolveShare(token)
  if (!resolved.ok) {
    return resolved
  }

  const { share, templateId, latexScaffold } = resolved.value

  if (share.kind !== 'template') {
    return err({
      kind: 'access_denied',
      message: 'This share link is not a template share.',
    })
  }

  // 2. Create a new resume for the target user — service-role client because
  //    this runs without a user session on the /t/:token page.
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('resumes')
    .insert({
      user_id: intoUserId,
      template_id: templateId ?? null,
      title: '',
      // Structural fields from share — never Resume_Data.
      latex_source: latexScaffold ?? null,
      // Resume_Data fields are explicitly empty.
      full_name: '',
      email: '',
      phone: '',
      location: '',
      summary: '',
      links: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      skills: [],
      achievements: [],
      pdf_path: null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return err({
      kind: 'not_found',
      message: error?.message ?? 'Failed to create resume from template.',
    })
  }

  return ok(rowToResume(data as ResumeRow))
}
