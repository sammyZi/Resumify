/**
 * job-matcher.ts — scores a resume against a pasted job description via OpenAI.
 *
 * Server-only module. Builds a structured snapshot of the resume, sends it with
 * the job description to the OpenAI chat completions API, and returns a typed
 * match report: an overall score, an estimated chance of being selected, the
 * keywords matched/missing, strengths, gaps, and actionable suggestions.
 *
 * Behaviour mirrors ai-refiner.ts:
 *  - Each attempt is bounded to 60 seconds via AbortSignal.timeout.
 *  - Up to 3 attempts are made before returning an error.
 *  - Returns Result<JobMatchResult, AppError> — never throws.
 */

import 'server-only'

import OpenAI from 'openai'
import { ok, err, type Result, type AppError } from '@/lib/result'
import { serverEnv } from '@/lib/env'
import type { ResumeData } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 60_000
const MAX_JD_CHARS = 12_000

// ─── Public types ─────────────────────────────────────────────────────────────

export type SelectionChance = 'Low' | 'Moderate' | 'High' | 'Very High'

export type JobMatchResult = {
  /** Overall match score, 0–100. */
  matchScore: number
  /** Coarse estimate of the chance of being shortlisted. */
  selectionChance: SelectionChance
  /** One or two sentence overview of the match. */
  summary: string
  /** Important keywords/skills from the JD that the resume already covers. */
  matchedKeywords: string[]
  /** Important keywords/skills from the JD that are missing from the resume. */
  missingKeywords: string[]
  /** Concrete strengths of this resume for this role. */
  strengths: string[]
  /** Gaps or weaknesses relative to the role. */
  gaps: string[]
  /** Actionable suggestions to improve the match. */
  suggestions: string[]
}

// ─── Resume snapshot for the prompt ────────────────────────────────────────────

function buildResumeSnapshot(data: ResumeData): string {
  const lines: string[] = []

  if (data.summary?.trim()) lines.push(`Summary: ${data.summary.trim()}`)

  if (data.experience.length > 0) {
    lines.push('\nExperience:')
    for (const e of data.experience) {
      const end = e.endDate ?? 'Present'
      lines.push(`- ${e.title} at ${e.organization} (${e.startDate} – ${end})`)
      if (e.description?.trim()) lines.push(`  ${e.description.trim()}`)
    }
  }

  if (data.projects.length > 0) {
    lines.push('\nProjects:')
    for (const p of data.projects) {
      const tech = p.techStack.length > 0 ? ` [${p.techStack.join(', ')}]` : ''
      lines.push(`- ${p.name}${tech}`)
      if (p.description?.trim()) lines.push(`  ${p.description.trim()}`)
    }
  }

  if (data.education.length > 0) {
    lines.push('\nEducation:')
    for (const e of data.education) {
      const end = e.endDate ?? 'Present'
      lines.push(`- ${e.credential}, ${e.institution} (${e.startDate} – ${end})`)
    }
  }

  if (data.certifications.length > 0) {
    lines.push('\nCertifications:')
    for (const c of data.certifications) {
      lines.push(`- ${c.name}${c.issuer ? `, ${c.issuer}` : ''}`)
    }
  }

  if (data.skills.length > 0) lines.push(`\nSkills: ${data.skills.join(', ')}`)

  if (data.achievements.length > 0) {
    lines.push('\nAchievements:')
    for (const a of data.achievements) lines.push(`- ${a}`)
  }

  return lines.join('\n').trim() || '(empty resume)'
}

// ─── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(resumeSnapshot: string, jobDescription: string): string {
  return `You are an expert technical recruiter and ATS (applicant tracking system) analyst. Compare the candidate's RESUME against the JOB DESCRIPTION and produce an objective match assessment.

=== RESUME ===
${resumeSnapshot}

=== JOB DESCRIPTION ===
${jobDescription}

Scoring guidance:
- matchScore is an integer 0-100 reflecting how well the resume fits the role (skills, experience, seniority, domain, keywords).
- selectionChance is one of "Low", "Moderate", "High", "Very High" and should be consistent with matchScore (roughly: <40 Low, 40-64 Moderate, 65-84 High, 85+ Very High).
- matchedKeywords: important skills/technologies/qualifications from the JD that the resume clearly demonstrates.
- missingKeywords: important skills/technologies/qualifications required by the JD that the resume does NOT show.
- strengths: short phrases describing where the candidate is a strong fit.
- gaps: short phrases describing where the candidate falls short.
- suggestions: concrete, actionable resume edits to improve the match (e.g. add a skill, quantify an achievement, surface relevant experience).

Be honest and specific. Base everything only on the provided text. Do not invent experience the candidate does not have.

Return ONLY a valid JSON object with exactly this shape (no markdown, no commentary):
{
  "matchScore": 0,
  "selectionChance": "Low",
  "summary": "...",
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "strengths": ["..."],
  "gaps": ["..."],
  "suggestions": ["..."]
}`
}

// ─── Parser ─────────────────────────────────────────────────────────────────────

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((s) => s.trim())
}

function normalizeChance(v: unknown, score: number): SelectionChance {
  const allowed: SelectionChance[] = ['Low', 'Moderate', 'High', 'Very High']
  if (typeof v === 'string') {
    const found = allowed.find((a) => a.toLowerCase() === v.trim().toLowerCase())
    if (found) return found
  }
  // Derive from score as a fallback.
  if (score >= 85) return 'Very High'
  if (score >= 65) return 'High'
  if (score >= 40) return 'Moderate'
  return 'Low'
}

function parseResponse(raw: string): JobMatchResult | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const matchScore = clampScore(parsed.matchScore)

    return {
      matchScore,
      selectionChance: normalizeChance(parsed.selectionChance, matchScore),
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      matchedKeywords: toStringArray(parsed.matchedKeywords),
      missingKeywords: toStringArray(parsed.missingKeywords),
      strengths: toStringArray(parsed.strengths),
      gaps: toStringArray(parsed.gaps),
      suggestions: toStringArray(parsed.suggestions),
    }
  } catch {
    return null
  }
}

// ─── matchJob ────────────────────────────────────────────────────────────────────

/**
 * Scores `resumeData` against `jobDescription`. Makes up to 3 attempts, each
 * bounded to 60 seconds. Returns the first valid result, or an error.
 */
export async function matchJob(input: {
  resumeData: ResumeData
  jobDescription: string
}): Promise<Result<JobMatchResult, AppError>> {
  const jobDescription = input.jobDescription.trim().slice(0, MAX_JD_CHARS)

  if (jobDescription.length < 20) {
    return err({
      code: 'job_match_empty',
      message: 'Please paste a longer job description to analyze.',
    })
  }

  const resumeSnapshot = buildResumeSnapshot(input.resumeData)
  const client = new OpenAI({ apiKey: serverEnv.openaiApiKey })
  const prompt = buildPrompt(resumeSnapshot, jobDescription)

  let lastError: AppError = { code: 'job_match_failed', message: 'Unknown error' }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS)

      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        },
        { signal }
      )

      const raw = response.choices[0]?.message?.content?.trim() ?? ''

      if (!raw) {
        lastError = { code: 'job_match_failed', message: 'OpenAI returned an empty response' }
        continue
      }

      const result = parseResponse(raw)

      if (!result) {
        lastError = {
          code: 'job_match_failed',
          message: `Failed to parse OpenAI response as JSON (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
        continue
      }

      return ok(result)
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error &&
        (e.name === 'TimeoutError' || e.name === 'AbortError' || e.message.includes('timeout'))

      if (isTimeout) {
        lastError = {
          code: 'job_match_timeout',
          message: `Job match timed out after ${TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
      } else {
        const message = e instanceof Error ? e.message : 'OpenAI request failed'
        lastError = { code: 'job_match_failed', message }
      }
    }
  }

  return err(lastError)
}

// ─── Tailor types ──────────────────────────────────────────────────────────────

export type TailoredResume = {
  /** Skills tailored for the JD — adds relevant, removes irrelevant. */
  skills: string[]
  /** Experience entries with rewritten descriptions aligned to the JD. */
  experience: { title: string; organization: string; startDate: string; endDate: string | null; description: string }[]
  /** Summary rewritten to align with the JD. */
  summary: string
}

// ─── tailorResume ──────────────────────────────────────────────────────────────

function buildTailorPrompt(resumeSnapshot: string, jobDescription: string, resumeData: ResumeData): string {
  const expJson = JSON.stringify(resumeData.experience)
  const skillsJson = JSON.stringify(resumeData.skills)
  return `You are an expert resume tailoring assistant. Given the candidate's current resume and a target JOB DESCRIPTION, produce a tailored version that maximizes ATS match.

=== CURRENT RESUME ===
${resumeSnapshot}

=== JOB DESCRIPTION ===
${jobDescription}

=== CURRENT SKILLS JSON ===
${skillsJson}

=== CURRENT EXPERIENCE JSON ===
${expJson}

Instructions:
1. SKILLS: Add important skills/technologies from the JD that the candidate plausibly has (based on their experience). Remove skills that are completely irrelevant to the job. Keep skills that are transferable or useful. You may reorder for relevance.
2. EXPERIENCE: Rewrite ONLY the "description" field of each experience entry to emphasize responsibilities and achievements that align with the JD. Keep the same number of experience entries; preserve "title", "organization", "startDate", "endDate" EXACTLY.
3. SUMMARY: Write a new 2-3 sentence professional summary that positions the candidate as a strong fit for this specific role.
4. Do NOT invent experience, certifications, or skills the candidate does not demonstrably have.
5. Do NOT include LaTeX, markdown formatting, or code in descriptions.

Return ONLY a valid JSON object:
{
  "skills": ["skill1", "skill2", ...],
  "experience": [{"title":"...","organization":"...","startDate":"...","endDate":"...","description":"..."},...],
  "summary": "..."
}`
}

function parseTailorResponse(raw: string, resumeData: ResumeData): TailoredResume | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const skills = toStringArray(parsed.skills)
    if (skills.length === 0) return null

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : resumeData.summary

    const experience: TailoredResume['experience'] = []
    if (Array.isArray(parsed.experience)) {
      for (let i = 0; i < parsed.experience.length; i++) {
        const e = parsed.experience[i] as Record<string, unknown> | undefined
        const orig = resumeData.experience[i]
        if (!e || !orig) continue
        experience.push({
          title: typeof e.title === 'string' ? e.title : orig.title,
          organization: typeof e.organization === 'string' ? e.organization : orig.organization,
          startDate: typeof e.startDate === 'string' ? e.startDate : orig.startDate,
          endDate: typeof e.endDate === 'string' ? e.endDate : (orig.endDate ?? null),
          description: typeof e.description === 'string' ? e.description : orig.description,
        })
      }
    }

    // If model returned fewer entries, fill remaining from original
    for (let i = experience.length; i < resumeData.experience.length; i++) {
      experience.push(resumeData.experience[i])
    }

    return { skills, experience, summary }
  } catch {
    return null
  }
}

/**
 * Tailors the resume's skills, experience descriptions, and summary to match
 * the given job description. Makes up to 3 attempts, each bounded to 60s.
 */
export async function tailorResume(input: {
  resumeData: ResumeData
  jobDescription: string
}): Promise<Result<TailoredResume, AppError>> {
  const jobDescription = input.jobDescription.trim().slice(0, MAX_JD_CHARS)

  if (jobDescription.length < 20) {
    return err({
      code: 'tailor_empty',
      message: 'Please paste a longer job description.',
    })
  }

  const { resumeData } = input
  const resumeSnapshot = buildResumeSnapshot(resumeData)
  const client = new OpenAI({ apiKey: serverEnv.openaiApiKey })
  const prompt = buildTailorPrompt(resumeSnapshot, jobDescription, resumeData)

  let lastError: AppError = { code: 'tailor_failed', message: 'Unknown error' }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS)

      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        },
        { signal }
      )

      const raw = response.choices[0]?.message?.content?.trim() ?? ''

      if (!raw) {
        lastError = { code: 'tailor_failed', message: 'OpenAI returned an empty response' }
        continue
      }

      const result = parseTailorResponse(raw, resumeData)

      if (!result) {
        lastError = {
          code: 'tailor_failed',
          message: `Failed to parse tailoring response (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
        continue
      }

      return ok(result)
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error &&
        (e.name === 'TimeoutError' || e.name === 'AbortError' || e.message.includes('timeout'))

      if (isTimeout) {
        lastError = {
          code: 'tailor_timeout',
          message: `Tailoring timed out after ${TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
      } else {
        const message = e instanceof Error ? e.message : 'OpenAI request failed'
        lastError = { code: 'tailor_failed', message }
      }
    }
  }

  return err(lastError)
}
