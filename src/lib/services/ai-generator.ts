/**
 * ai-generator.ts — AI_Generator: produces LaTeX resume source via OpenAI.
 *
 * Server-only module. Builds a structured prompt from validated ResumeData
 * and a Template, then calls the OpenAI chat completions API.
 *
 * Behaviour:
 *  - Each attempt is bounded to 60 seconds via AbortSignal.timeout.
 *  - Up to 3 attempts are made before returning an error.
 *  - Returns Result<{ latex: string }, AppError> — never throws.
 *
 * Requirements: 6.1, 6.3
 */

import 'server-only'

import OpenAI from 'openai'
import { ok, err, type Result, type AppError } from '@/lib/result'
import { serverEnv } from '@/lib/env'
import type { ResumeData, Template } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 60_000

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(resumeData: ResumeData, template: Template): string {
  const { fullName, email, experience, education, skills } = resumeData

  const experienceSection = experience
    .map((e) => {
      const end = e.endDate ?? 'Present'
      return [
        `  - Title: ${e.title}`,
        `    Organization: ${e.organization}`,
        `    Period: ${e.startDate} – ${end}`,
        `    Description: ${e.description}`,
      ].join('\n')
    })
    .join('\n')

  const educationSection = education
    .map((e) => {
      const end = e.endDate ?? 'Present'
      return [
        `  - Institution: ${e.institution}`,
        `    Credential: ${e.credential}`,
        `    Period: ${e.startDate} – ${end}`,
        `    Description: ${e.description}`,
      ].join('\n')
    })
    .join('\n')

  const skillsSection = skills.join(', ')

  return `You are a LaTeX resume generator. Produce a complete, valid LaTeX resume source document.

Use the following LaTeX scaffold as your structural starting point — preserve its structure and replace the placeholder content with the candidate's actual data:

--- LATEX SCAFFOLD START ---
${template.latexScaffold}
--- LATEX SCAFFOLD END ---

Candidate information to incorporate:
- Full Name: ${fullName}
- Email: ${email}

Experience:
${experienceSection || '  (none)'}

Education:
${educationSection || '  (none)'}

Skills: ${skillsSection || '(none)'}

Instructions:
1. Replace all placeholder content in the scaffold with the candidate's actual data above.
2. Ensure the output is a complete, compilable LaTeX document.
3. Return ONLY the raw LaTeX code — no markdown fences, no code blocks, no explanatory text before or after.
4. Do not add any commentary, preamble explanation, or closing notes.`
}

// ─── generateLatex ────────────────────────────────────────────────────────────

/**
 * Generates a LaTeX resume source by calling the OpenAI chat completions API.
 *
 * Makes up to 3 attempts, each bounded to 60 seconds. Returns the first
 * successful LaTeX response, or an error if all attempts fail.
 *
 * Requirements: 6.1, 6.3
 */
export async function generateLatex(input: {
  resumeData: ResumeData
  template: Template
}): Promise<Result<{ latex: string }, AppError>> {
  const { resumeData, template } = input
  const client = new OpenAI({ apiKey: serverEnv.openaiApiKey })
  const prompt = buildPrompt(resumeData, template)

  let lastError: AppError = { code: 'generation_failed', message: 'Unknown error' }

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

      const latex = response.choices[0]?.message?.content?.trim() ?? ''

      if (!latex) {
        lastError = { code: 'generation_failed', message: 'OpenAI returned an empty response' }
        continue
      }

      return ok({ latex })
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error &&
        (e.name === 'TimeoutError' || e.name === 'AbortError' || e.message.includes('timeout'))

      if (isTimeout) {
        lastError = {
          code: 'generation_timeout',
          message: `Generation timed out after ${TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`,
        }
      } else {
        const message = e instanceof Error ? e.message : 'OpenAI request failed'
        lastError = { code: 'generation_failed', message }
      }
    }
  }

  return err(lastError)
}
