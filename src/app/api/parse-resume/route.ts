/**
 * route.ts — POST /api/parse-resume
 *
 * Accepts a PDF file upload (multipart/form-data), extracts its text content
 * using pdf-parse, sends the text to OpenAI for structured parsing into
 * ResumeData, validates the result, and returns it.
 *
 * Constraints:
 *  - Auth required (401 for unauthenticated)
 *  - Max file size: 5 MB
 *  - Only application/pdf accepted
 *  - Uses gpt-4o-mini for parsing
 *  - 60-second timeout per OpenAI call, up to 3 attempts
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { serverEnv } from '@/lib/env'
import { resumeDataSchema } from '@/lib/validation'
import type { ResumeData } from '@/lib/types'
import OpenAI from 'openai'

// pdf-parse is imported dynamically inside the handler to avoid
// module-init side effects (DOMMatrix, canvas polyfill attempts).

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_ATTEMPTS = 3
const TIMEOUT_MS = 60_000

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildParsePrompt(text: string): string {
  return `You are an expert resume parser. Given the raw text extracted from a PDF resume, parse it into structured JSON matching exactly this shape:

{
  "fullName": "string (required)",
  "email": "string (required, valid email)",
  "phone": "string (optional)",
  "location": "string (optional)",
  "summary": "string (optional, professional summary or objective)",
  "links": [
    { "type": "linkedin | github | leetcode | twitter | dribbble | medium | website | other", "url": "string" }
  ],
  "experience": [
    {
      "title": "string (job title)",
      "organization": "string (company name)",
      "startDate": "string (e.g. 2020-01)",
      "endDate": "string or null (null if current/present)",
      "description": "string (responsibilities, achievements)"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "techStack": ["string"],
      "liveUrl": "string (deployed/live link)",
      "repoUrl": "string (source code repository link)"
    }
  ],
  "education": [
    {
      "institution": "string",
      "credential": "string (degree, certification)",
      "startDate": "string",
      "endDate": "string or null",
      "description": "string"
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "year": "string (legacy year)",
      "url": "string (verification link or credential URL)",
      "issueDate": "string (e.g. 2021-05)",
      "expiryDate": "string or null (e.g. 2024-05 or null if does not expire)"
    }
  ],
  "skills": ["string"],
  "achievements": ["string"]
}

CRITICAL INSTRUCTIONS FOR URL/LINK EXTRACTION:

At the end of the text there is a "--- Hyperlinks found in the PDF ---" section. Each line shows:
  "display text near the link" → actual_url

You MUST use these URLs carefully:

1. PROFILE-LEVEL LINKS (put in the top-level "links" array):
   - A github.com URL with only a username (e.g. github.com/johndoe) → type "github"
   - A linkedin.com/in/... URL → type "linkedin"
   - A leetcode.com/... URL → type "leetcode"
   - A twitter.com or x.com URL → type "twitter"
   - A personal portfolio/website URL → type "website"
   - Any other profile-level URL → type "other"

2. PROJECT & CERTIFICATION SPECIFIC LINKS:
   - A github.com URL with a username AND repo name (e.g. github.com/johndoe/my-project) is a REPO URL → put in "repoUrl" of the matching project
   - A deployed app URL (e.g. vercel.app, netlify.app, herokuapp.com, or any custom domain near a project) → put in "liveUrl" of the matching project
   - A credential verification link (e.g. credly.com, udemy.com/certificate/..., coursera.org/verify/...) → put in "url" of the matching certification
   - Match links using display text context. E.g. if display text says "AWS Certified" and URL is credly.com/..., that URL belongs to AWS Certified.

3. Do NOT put project or certification URLs in the top-level "links" array. Only put profile-level links there.

OTHER INSTRUCTIONS:
4. Extract ALL information you can find from the resume text.
5. For dates, normalize to YYYY-MM format (e.g. "2020-01"). If only a year is given, use "YYYY-01". If "Present" or "Current", use null for endDate.
6. If a field is not found in the resume, use empty string "" for strings, empty array [] for arrays, and null where specified.
7. For experience descriptions, preserve bullet points as a single string with newline separators.
8. For projects, identify tech stack from the description or dedicated tech sections.
9. Return ONLY valid JSON — no markdown fences, no code blocks, no commentary.

Resume text:
---
${text}
---

Return ONLY the JSON object.`
}

// ── Parse OpenAI response ─────────────────────────────────────────────────────

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

function parseAIResponse(raw: string): ResumeData | null {
  try {
    const cleaned = stripMarkdownFences(raw)
    const parsed = JSON.parse(cleaned)

    // Ensure arrays default to empty arrays and strings default to empty strings
    const normalized = {
      fullName: parsed.fullName ?? '',
      email: parsed.email ?? '',
      phone: parsed.phone ?? '',
      location: parsed.location ?? '',
      summary: parsed.summary ?? '',
      links: Array.isArray(parsed.links) ? parsed.links : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((p: Record<string, unknown>) => ({
            name: p.name ?? '',
            description: p.description ?? '',
            techStack: Array.isArray(p.techStack) ? p.techStack : [],
            liveUrl: p.liveUrl ?? '',
            repoUrl: p.repoUrl ?? '',
          }))
        : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications
        : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      achievements: Array.isArray(parsed.achievements)
        ? parsed.achievements
        : [],
    }

    return normalized as ResumeData
  } catch {
    return null
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Extract file from multipart form data ───────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { success: false, message: 'Invalid form data. Please upload a PDF file.' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return Response.json(
      { success: false, message: 'No file uploaded. Please select a PDF file.' },
      { status: 400 }
    )
  }

  // ── Validate file type ──────────────────────────────────────────────────────
  if (file.type !== 'application/pdf') {
    return Response.json(
      { success: false, message: 'Only PDF files are accepted.' },
      { status: 400 }
    )
  }

  // ── Validate file size ──────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      {
        success: false,
        message: `File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
      },
      { status: 400 }
    )
  }

  // ── Extract text + hyperlink URLs from PDF ──────────────────────────────────
  // pdf-parse only extracts visible text by default. Hyperlinks (e.g. "GitHub"
  // pointing to https://github.com/user) are stored as annotations, not text.
  // We use a custom pagerender to extract both text AND link annotations.
  let pdfText: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Each collected link has the URL plus the display text near it
    const collectedLinks: { url: string; nearText: string }[] = []

    // Custom page renderer that extracts text + link annotations with context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function renderPageWithLinks(pageData: any): Promise<string> {
      // Extract text items (same logic as pdf-parse default)
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textItems: any[] = textContent.items
      let lastY: number | undefined
      let text = ''
      for (const item of textItems) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str
        } else {
          text += '\n' + item.str
        }
        lastY = item.transform[5]
      }

      // Extract hyperlink annotations with nearby display text
      try {
        const annotations = await pageData.getAnnotations()
        for (const annot of annotations) {
          if (annot.subtype === 'Link' && annot.url) {
            // Find text items that overlap the annotation rectangle.
            // Annotation rect = [x1, y1, x2, y2].
            const [ax1, ay1, ax2, ay2] = annot.rect ?? [0, 0, 0, 0]
            const nearbyText: string[] = []

            for (const item of textItems) {
              if (!item.str?.trim()) continue
              const iy = item.transform[5] // text baseline Y
              const ix = item.transform[4] // text X position
              // Check if text item is near the annotation vertically (within 5pts)
              // and horizontally overlaps or is nearby
              if (
                Math.abs(iy - ay1) < 15 &&
                ix < ax2 + 50 &&
                ix + (item.width ?? 100) > ax1 - 50
              ) {
                nearbyText.push(item.str.trim())
              }
            }

            collectedLinks.push({
              url: annot.url,
              nearText: nearbyText.join(' ').substring(0, 120) || '(no display text)',
            })
          }
        }
      } catch {
        // Annotation extraction is best-effort; don't fail the whole parse
      }

      return text
    }

    // Dynamic import avoids module-init side effects (DOMMatrix, canvas polyfills).
    const mod = await import('pdf-parse')
    const pdfParse = (typeof mod.default === 'function' ? mod.default : mod) as (
      buf: Buffer,
      opts?: Record<string, unknown>
    ) => Promise<{ text: string; numpages: number }>
    const result = await pdfParse(buffer, { pagerender: renderPageWithLinks })

    // Combine the extracted text with hyperlink URLs + their context
    let fullText = result.text.trim()
    if (collectedLinks.length > 0) {
      // De-duplicate by URL
      const seen = new Set<string>()
      const unique = collectedLinks.filter((l) => {
        if (seen.has(l.url)) return false
        seen.add(l.url)
        return true
      })
      fullText += '\n\n--- Hyperlinks found in the PDF (display text → URL) ---\n'
      for (const link of unique) {
        fullText += `"${link.nearText}" → ${link.url}\n`
      }
    }

    pdfText = fullText
  } catch (e) {
    console.error('[parse-resume] PDF extraction failed:', e)
    return Response.json(
      {
        success: false,
        message: 'Failed to read PDF. The file may be corrupted or password-protected.',
      },
      { status: 422 }
    )
  }

  if (!pdfText || pdfText.length < 20) {
    return Response.json(
      {
        success: false,
        message:
          'No readable text found in the PDF. This may be a scanned or image-only resume — try a text-based PDF instead.',
      },
      { status: 422 }
    )
  }

  // ── Send to OpenAI for structured parsing ───────────────────────────────────
  const client = new OpenAI({ apiKey: serverEnv.openaiApiKey })
  const prompt = buildParsePrompt(pdfText)

  let lastErrorMsg = 'Unknown error during resume parsing.'

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS)

      const response = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        },
        { signal }
      )

      const raw = response.choices[0]?.message?.content?.trim() ?? ''

      if (!raw) {
        lastErrorMsg = 'AI returned an empty response. Please try again.'
        continue
      }

      const parsed = parseAIResponse(raw)

      if (!parsed) {
        lastErrorMsg = `Failed to parse AI response (attempt ${attempt}/${MAX_ATTEMPTS}).`
        continue
      }

      // Validate with Zod — soft validation (we still return parsed data on failure
      // since the AI output is best-effort; the user can fix fields in the form)
      const validation = resumeDataSchema.safeParse(parsed)

      if (validation.success) {
        return Response.json({ success: true, data: validation.data })
      }

      // Return the parsed data even if validation fails — the form will catch errors on save
      return Response.json({ success: true, data: parsed })
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error &&
        (e.name === 'TimeoutError' ||
          e.name === 'AbortError' ||
          e.message.includes('timeout'))

      if (isTimeout) {
        lastErrorMsg = `Parsing timed out (attempt ${attempt}/${MAX_ATTEMPTS}). Please try again.`
      } else {
        lastErrorMsg =
          e instanceof Error ? e.message : 'AI request failed. Please try again.'
      }
    }
  }

  return Response.json(
    { success: false, message: lastErrorMsg },
    { status: 500 }
  )
}
