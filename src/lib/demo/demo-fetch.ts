'use client'

/**
 * demo-fetch.ts — installs a window.fetch interceptor for demo mode.
 *
 * When demo mode is active, requests to /api/* are served from IndexedDB
 * (demo-db.ts) so the real app pages work without a backend session. Stateless
 * AI endpoints (refine, match, tailor, parse-resume) are forwarded to the
 * server with an `x-demo-mode` header and the local resume data attached.
 *
 * PDF download is handled directly in the preview page (client print) because
 * it uses window.open, which is not interceptable here.
 */

import { isDemoMode } from './demo-mode'
import { validateResumeData } from '@/lib/validation'
import { TEMPLATES } from '@/lib/templates/registry'
import type { ResumeData } from '@/lib/types'
import * as db from './demo-db'

let installed = false
let nativeFetch: typeof fetch

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function match(pathname: string, pattern: RegExp): RegExpMatchArray | null {
  return pathname.match(pattern)
}

/**
 * Returns a Response for a demo-handled request, or null to fall through to the
 * network (non-/api requests, or endpoints we don't handle).
 */
async function handle(url: string, init: RequestInit | undefined): Promise<Response | null> {
  const u = new URL(url, window.location.origin)
  const path = u.pathname
  if (!path.startsWith('/api/')) return null

  const method = (init?.method ?? 'GET').toUpperCase()
  const bodyText = typeof init?.body === 'string' ? init.body : null
  const parseBody = <T,>(): T => (bodyText ? (JSON.parse(bodyText) as T) : ({} as T))

  // ── /api/resumes ─────────────────────────────────────────────────────────
  if (path === '/api/resumes') {
    if (method === 'GET') return json({ resumes: await db.listResumes() })
    if (method === 'POST') {
      const body = parseBody<{ templateId?: string }>()
      const resume = await db.createResume(body.templateId)
      return json({ resume }, 201)
    }
  }

  // ── /api/resumes/:id/... ───────────────────────────────────────────────────
  let m = match(path, /^\/api\/resumes\/([^/]+)$/)
  if (m) {
    const id = m[1]
    if (method === 'GET') {
      const resume = await db.getResume(id)
      return resume ? json({ resume }) : json({ error: 'Not found' }, 404)
    }
    if (method === 'PUT') {
      const body = parseBody<unknown>()
      const validation = validateResumeData(body)
      if (!validation.ok) return json({ success: false, errors: validation.error.fields }, 422)
      const resume = await db.saveResumeData(id, validation.value)
      return resume ? json({ success: true, resume }) : json({ error: 'Not found' }, 404)
    }
    if (method === 'PATCH') {
      const body = parseBody<{ title?: string }>()
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title) return json({ success: false, message: 'Title is required' }, 400)
      const resume = await db.renameResumeById(id, title)
      return resume ? json({ success: true, resume }) : json({ error: 'Not found' }, 404)
    }
    if (method === 'DELETE') {
      const okDel = await db.deleteResumeById(id)
      return okDel ? json({ success: true }) : json({ error: 'Not found' }, 404)
    }
  }

  m = match(path, /^\/api\/resumes\/([^/]+)\/template$/)
  if (m && method === 'PUT') {
    const body = parseBody<{ templateId?: string }>()
    if (!body.templateId) return json({ success: false, message: 'templateId is required' }, 400)
    const resume = await db.setTemplate(m[1], body.templateId)
    return resume ? json({ success: true }) : json({ success: false, message: 'Not found' }, 404)
  }

  m = match(path, /^\/api\/resumes\/([^/]+)\/save-to-profile$/)
  if (m && method === 'POST') {
    const profile = await db.saveResumeToProfile(m[1])
    return profile ? json({ success: true, profile }) : json({ error: 'Not found' }, 404)
  }

  // AI: refine (resume) → route to stateless /api/profile/refine with local data
  m = match(path, /^\/api\/resumes\/([^/]+)\/refine$/)
  if (m && method === 'POST') {
    const id = m[1]
    const body = parseBody<{ scope?: unknown }>()
    const resume = await db.getResume(id)
    const data: ResumeData | null = resume ? toData(resume) : null
    return nativeFetch('/api/profile/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-mode': '1' },
      body: JSON.stringify({ scope: body.scope, data }),
    })
  }

  // AI: match / tailor → forward to same endpoint with local data + demo header
  m = match(path, /^\/api\/resumes\/([^/]+)\/(match|tailor)$/)
  if (m && method === 'POST') {
    const id = m[1]
    const body = parseBody<Record<string, unknown>>()
    const resume = await db.getResume(id)
    if (!resume) return json({ error: 'Not found' }, 404)
    return nativeFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-mode': '1' },
      body: JSON.stringify({ ...body, data: toData(resume) }),
    })
  }

  // ── /api/profile ───────────────────────────────────────────────────────────
  if (path === '/api/profile') {
    if (method === 'GET') return json({ profile: await db.getProfile() })
    if (method === 'PUT') {
      const body = parseBody<unknown>()
      const validation = validateResumeData(body)
      if (!validation.ok) return json({ success: false, errors: validation.error.fields }, 422)
      const profile = await db.saveProfile(validation.value)
      return json({ success: true, profile })
    }
  }

  // AI: profile refine → forward to server statelessly with demo header
  if (path === '/api/profile/refine' && method === 'POST') {
    return nativeFetch('/api/profile/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-demo-mode': '1' },
      body: bodyText ?? '{}',
    })
  }

  // ── /api/templates ─────────────────────────────────────────────────────────
  if (path === '/api/templates' && method === 'GET') {
    const roleCategory = u.searchParams.get('roleCategory')
    const templates = roleCategory ? TEMPLATES.filter((t) => t.roleCategory === roleCategory) : TEMPLATES
    return json({ templates })
  }

  // ── /api/shares ────────────────────────────────────────────────────────────
  if (path === '/api/shares') {
    if (method === 'GET') {
      const resumeId = u.searchParams.get('resumeId')
      if (!resumeId) return json({ error: 'resumeId is required' }, 400)
      return json({ shares: await db.listShares(resumeId) })
    }
    if (method === 'POST') {
      const body = parseBody<{ resumeId?: string; kind?: 'recruiter' | 'template' }>()
      if (!body.resumeId || !body.kind) return json({ error: 'resumeId and kind are required' }, 400)
      const share = await db.createShare(body.resumeId, body.kind)
      return json({ share: { id: share.id, token: share.token, kind: share.kind, resumeId: share.resumeId } }, 201)
    }
  }

  m = match(path, /^\/api\/shares\/([^/]+)\/revoke$/)
  if (m && method === 'POST') {
    await db.revokeShareById(m[1])
    return json({ success: true })
  }

  // parse-resume (PDF import) → forward with demo header, keep FormData body
  if (path === '/api/parse-resume' && method === 'POST') {
    const headers = new Headers(init?.headers)
    headers.set('x-demo-mode', '1')
    return nativeFetch('/api/parse-resume', { ...init, headers })
  }

  // Anything else under /api we don't handle in demo → let it hit the network.
  return null
}

function toData(resume: {
  fullName: string; email: string; phone: string; location: string; summary: string
  links: ResumeData['links']; experience: ResumeData['experience']; projects: ResumeData['projects']
  education: ResumeData['education']; certifications: ResumeData['certifications']
  skills: string[]; achievements: string[]
}): ResumeData {
  return {
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
  }
}

/** Installs the fetch interceptor exactly once. Safe to call repeatedly. */
export function installDemoFetch(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  nativeFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (isDemoMode()) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      try {
        const handled = await handle(url, init)
        if (handled) return handled
      } catch {
        // On any demo-handler error, fall through to the network.
      }
    }
    return nativeFetch(input, init)
  }
}
