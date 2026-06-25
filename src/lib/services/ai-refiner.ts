/**
 * ai-refiner.ts — AI_Refiner: rewrites resume content via OpenAI.
 *
 * Server-only module. Accepts a scope (all | section | entry) and optional
 * role-category context, builds a prompt from the in-scope content, calls
 * the OpenAI chat completions API, and returns structured suggestions.
 *
 * Behaviour:
 *  - Each attempt is bounded to 60 seconds via AbortSignal.timeout.
 *  - Up to 3 attempts are made before returning an error.
 *  - If target content is empty, returns err immediately without calling OpenAI.
 *  - Returns Result<RefinementSuggestion, AppError> — never throws.
 *  - Never emits LaTeX or contact details (fullName, email) in suggestions.
 *
 * Requirements: 12.2, 12.3, 12.4, 12.8, 12.10
 */

import 'server-only'

import OpenAI from 'openai'
import { ok, err, type Result, type AppError } from '@/lib/result'
import { serverEnv } from '@/lib/env'
import type { ResumeData, ExperienceEntry, EducationEntry } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 60_000

// ─── Public types ─────────────────────────────────────────────────────────────

export type RefineScope =
  | { kind: 'all' }
  | { kind: 'section'; section: 'experience' | 'education' | 'skills' }
  | { kind: 'entry'; section: 'experience' | 'education'; index: number }

export type RefinementSuggestion = {
  scope: RefineScope
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  skills?: string[]
}

// ─── Empty-scope check ────────────────────────────────────────────────────────

/**
 * Returns true when the target content for the given scope is empty,
 * meaning there is nothing to refine.
 */
function isScopeEmpty(resumeData: ResumeData, scope: RefineScope): boolean {
  switch (scope.kind) {
    case 'all':
      return (
        resumeData.experience.length === 0 &&
        resumeData.education.length === 0 &&
        resumeData.skills.length === 0
      )
    case 'section':
      if (scope.section === 'experience') return resumeData.experience.length === 0
      if (scope.section === 'education') return resumeData.education.length === 0
      return resumeData.skills.length === 0
    case 'entry': {
      const list =
        scope.section === 'experience' ? resumeData.experience : resumeData.education
      return scope.index < 0 || scope.index >= list.length
    }
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function formatExperienceEntries(entries: ExperienceEntry[]): string {
  return entries
    .map((e, i) => {
      const end = e.endDate ?? 'Present'
      return [
        `  [${i}] Title: ${e.title}`,
        `      Organization: ${e.organization}`,
        `      Period: ${e.startDate} – ${end}`,
        `      Description: ${e.description}`,
      ].join('\n')
    })
    .join('\n')
}

function formatEducationEntries(entries: EducationEntry[]): string {
  return entries
    .map((e, i) => {
      const end = e.endDate ?? 'Present'
      return [
        `  [${i}] Institution: ${e.institution}`,
        `      Credential: ${e.credential}`,
        `      Period: ${e.startDate} – ${end}`,
        `      Description: ${e.description}`,
      ].join('\n')
    })
    .join('\n')
}

function buildResponseShape(scope: RefineScope): string {
  switch (scope.kind) {
    case 'all':
      return `{
  "experience": [ { "title": "...", "organization": "...", "startDate": "...", "endDate": "...", "description": "..." }, ... ],
  "education": [ { "institution": "...", "credential": "...", "startDate": "...", "endDate": "...", "description": "..." }, ... ],
  "skills": [ "skill1", "skill2", ... ]
}`
    case 'section':
      if (scope.section === 'experience') {
        return `{
  "experience": [ { "title": "...", "organization": "...", "startDate": "...", "endDate": "...", "description": "..." }, ... ]
}`
      }
      if (scope.section === 'education') {
        return `{
  "education": [ { "institution": "...", "credential": "...", "startDate": "...", "endDate": "...", "description": "..." }, ... ]
}`
      }
      return `{
  "skills": [ "skill1", "skill2", ... ]
}`
    case 'entry':
      if (scope.section === 'experience') {
        return `{
  "experience": [ { "title": "...", "organization": "...", "startDate": "...", "endDate": "...", "description": "..." } ]
}`
      }
      return `{
  "education": [ { "institution": "...", "credential": "...", "startDate": "...", "endDate": "...", "description": "..." } ]
}`
  }
}

function buildPrompt(resumeData: ResumeData, scope: RefineScope, roleCategory?: string): string {
  const roleContext = roleCategory ? `Target role: ${roleCategory}\n\n` : ''

  let contentSection: string
  switch (scope.kind) {
    case 'all': {
      const expLines =
        resumeData.experience.length > 0
          ? formatExperienceEntries(resumeData.experience)
          : '  (none)'
      const eduLines =
        resumeData.education.length > 0
          ? formatEducationEntries(resumeData.education)
          : '  (none)'
      const skillsLine =
        resumeData.skills.length > 0 ? resumeData.skills.join(', ') : '(none)'
      contentSection = `Experience:\n${expLines}\n\nEducation:\n${eduLines}\n\nSkills: ${skillsLine}`
      break
    }
    case 'section': {
      if (scope.section === 'experience') {
        const expLines = formatExperienceEntries(resumeData.experience)
        contentSection = `Experience:\n${expLines}`
      } else if (scope.section === 'education') {
        const eduLines = formatEducationEntries(resumeData.education)
        contentSection = `Education:\n${eduLines}`
      } else {
        const skillsLine = resumeData.skills.join(', ')
        contentSection = `Skills: ${skillsLine}`
      }
      break
    }
    case 'entry': {
      if (scope.section === 'experience') {
        const entry = resumeData.experience[scope.index]
        contentSection = `Experience entry [${scope.index}]:\n${formatExperienceEntries([entry])}`
      } else {
        const entry = resumeData.education[scope.index]
        contentSection = `Education entry [${scope.index}]:\n${formatEducationEntries([entry])}`
      }
      break
    }
  }

  const responseShape = buildResponseShape(scope)

  return `You are a professional resume editor. Your task is to rewrite and improve the provided resume content to be more compelling, concise, and impactful.

${roleContext}${contentSection}

Instructions:
1. Rewrite only text fields: titles, descriptions, credential names, and skill labels.
2. Preserve ALL structural fields exactly as given: dates (startDate, endDate), organization names, institution names. Do NOT change these.
3. Make descriptions action-oriented, quantified where possible, and free of clichés.
4. Do NOT include LaTeX commands, markup, or formatting symbols in your output.
5. Do NOT include contact information (name, email) in your output.
6. Return ONLY a valid JSON object — no markdown fences, no code blocks, no commentary before or after.
7. The JSON object must match exactly this shape:

${responseShape}

Return ONLY the JSON object, nothing else.`
}

// ─── Response parser ──────────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  // Strip ```json ... ``` or ``` ... ``` wrappers
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

function parseResponse(raw: string, scope: RefineScope): RefinementSuggestion | null {
  try {
    const cleaned = stripMarkdownFences(raw)
    const parsed = JSON.parse(cleaned) as Record<string, unknown>

    const suggestion: RefinementSuggestion = { scope }

    if (Array.isArray(parsed.experience)) {
      suggestion.experience = parsed.experience as ExperienceEntry[]
    }
    if (Array.isArray(parsed.education)) {
      suggestion.education = parsed.education as EducationEntry[]
    }
    if (Array.isArray(parsed.skills)) {
      suggestion.skills = parsed.skills as string[]
    }

    // Must have at least one field
    if (
      suggestion.experience === undefined &&
      suggestion.education === undefined &&
      suggestion.skills === undefined
    ) {
      return null
    }

    return suggestion
  } catch {
    return null
  }
}

// ─── refine ───────────────────────────────────────────────────────────────────

/**
 * Refines resume content for the given scope by calling the OpenAI chat
 * completions API.
 *
 * Makes up to 3 attempts, each bounded to 60 seconds. Returns the first
 * successful suggestion, or an error if all attempts fail.
 *
 * Requirements: 12.2, 12.3, 12.4, 12.8, 12.10
 */
export async function refine(input: {
  resumeData: ResumeData
  scope: RefineScope
  roleCategory?: string
}): Promise<Result<RefinementSuggestion, AppError>> {
  const { resumeData, scope, roleCategory } = input

  // Requirement 12.10 — empty scope pre-check
  if (isScopeEmpty(resumeData, scope)) {
    return err({
      code: 'refinement_empty_scope',
      message: 'The target content for the requested scope is empty — nothing to refine.',
    })
  }

  const client = new OpenAI({ apiKey: serverEnv.openaiApiKey })
  const prompt = buildPrompt(resumeData, scope, roleCategory)

  let lastError: AppError = { code: 'refinement_failed', message: 'Unknown error' }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS)

      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        },
        { signal }
      )

      const raw = response.choices[0]?.message?.content?.trim() ?? ''

      if (!raw) {
        lastError = { code: 'refinement_failed', message: 'OpenAI returned an empty response' }
        continue
      }

      const suggestion = parseResponse(raw, scope)

      if (!suggestion) {
        lastError = {
          code: 'refinement_failed',
          message: `Failed to parse OpenAI response as JSON (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
        continue
      }

      return ok(suggestion)
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error &&
        (e.name === 'TimeoutError' || e.name === 'AbortError' || e.message.includes('timeout'))

      if (isTimeout) {
        lastError = {
          code: 'refinement_timeout',
          message: `Refinement timed out after ${TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
      } else {
        const message = e instanceof Error ? e.message : 'OpenAI request failed'
        lastError = { code: 'refinement_failed', message }
      }
    }
  }

  return err(lastError)
}
