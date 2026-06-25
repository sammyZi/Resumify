/**
 * route.ts — GET + POST /api/resumes
 *
 * GET  /api/resumes  — list all resumes for the authenticated user
 * POST /api/resumes  — create a new resume, pre-filling from stored profile if
 *                      one exists (Req 11.4, 11.5).  Body may include
 *                      { templateId?: string }.
 *
 * Both routes enforce an authenticated session.  Unauthenticated requests
 * receive HTTP 401 { error: 'Unauthorized' } with no resume content.
 *
 * Requirements: 5.2, 5.3, 11.4, 11.5, 10.1
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/stores/profile-store'
import { createResume } from '@/lib/stores/resume-store'
import type { Resume } from '@/lib/types'

// ─── Row shape returned by Supabase for the resumes table ────────────────────

type ResumeRow = {
  id: string
  user_id: string
  template_id: string | null
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
  latex_source: string | null
  pdf_path: string | null
}

function rowToResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    location: row.location ?? '',
    summary: row.summary ?? '',
    links: (row.links as Resume['links']) ?? [],
    experience: row.experience as Resume['experience'],
    projects: (row.projects as Resume['projects']) ?? [],
    education: row.education as Resume['education'],
    certifications: (row.certifications as Resume['certifications']) ?? [],
    skills: row.skills as Resume['skills'],
    achievements: (row.achievements as Resume['achievements']) ?? [],
    latexSource: row.latex_source,
    pdfPath: row.pdf_path,
  }
}

// ─── GET /api/resumes ─────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json(
      { success: false, message: 'Failed to load resumes', retry: true },
      { status: 500 }
    )
  }

  const resumes = (data as ResumeRow[]).map(rowToResume)

  return Response.json({ resumes })
}

// ─── POST /api/resumes ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse optional body — missing or non-JSON body is fine (no required fields).
  let templateId: string | undefined
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && 'templateId' in body) {
      templateId = body.templateId as string
    }
  } catch {
    // Body is empty or not JSON — proceed without a templateId.
  }

  // Attempt to pre-fill from the stored profile (Req 11.4, 11.5).
  // A missing profile is not an error; we simply create an empty resume.
  let prefill: Parameters<typeof createResume>[1] | undefined
  const profileResult = await getProfile(user.id)
  if (profileResult.ok) {
    const p = profileResult.value
    prefill = {
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      location: p.location,
      summary: p.summary,
      links: p.links,
      experience: p.experience,
      projects: p.projects,
      education: p.education,
      certifications: p.certifications,
      skills: p.skills,
      achievements: p.achievements,
    }
  }

  const result = await createResume(user.id, prefill, templateId)

  if (!result.ok) {
    return Response.json(
      { success: false, message: 'Failed to create resume', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ resume: result.value }, { status: 201 })
}
