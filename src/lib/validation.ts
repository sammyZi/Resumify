/**
 * validation.ts — shared Zod-based validation schema for Resume_Data and User_Profile.
 *
 * A single schema is shared by both Resume_Data (ResumeStore) and User_Profile
 * (ProfileStore) because they carry identical structured fields.
 *
 * Requirements: 5.1, 5.3, 5.6, 11.8
 */

import { z } from 'zod'
import { ok, err, type Result } from './result'
import type { ResumeData } from './types'

// ─── ValidationError ──────────────────────────────────────────────────────────

/**
 * Returned by `validateResumeData` when one or more fields fail validation.
 * `fields` is keyed by dot-path (e.g. "experience[0].title") and maps to the
 * list of human-readable error messages for that path.
 */
export type ValidationError = {
  fields: Record<string, string[]>
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const experienceEntrySchema = z.object({
  title:        z.string().max(200, 'Must be 200 characters or fewer'),
  organization: z.string().max(200, 'Must be 200 characters or fewer'),
  startDate:    z.string(),
  endDate:      z.string().nullable(),
  description:  z.string().max(2000, 'Must be 2,000 characters or fewer'),
})

const educationEntrySchema = z.object({
  institution: z.string().max(200, 'Must be 200 characters or fewer'),
  credential:  z.string().max(200, 'Must be 200 characters or fewer'),
  startDate:   z.string(),
  endDate:     z.string().nullable(),
  description: z.string().max(2000, 'Must be 2,000 characters or fewer'),
})

const projectEntrySchema = z.object({
  name:        z.string().max(200, 'Must be 200 characters or fewer'),
  description: z.string().max(2000, 'Must be 2,000 characters or fewer'),
  techStack:   z
    .array(z.string().max(100, 'Each technology must be 100 characters or fewer'))
    .max(30, 'A project may list at most 30 technologies'),
  liveUrl:     z.string().max(300, 'Link must be 300 characters or fewer'),
  repoUrl:     z.string().max(300, 'Link must be 300 characters or fewer'),
})

const certificationEntrySchema = z.object({
  name:   z.string().max(200, 'Must be 200 characters or fewer'),
  issuer: z.string().max(200, 'Must be 200 characters or fewer'),
  year:   z.string().max(20, 'Must be 20 characters or fewer'),
})

// ─── Root schema ─────────────────────────────────────────────────────────────

/**
 * Zod schema for ResumeData (also used to validate User_Profile input, which
 * carries the same fields).
 *
 * Rules:
 *  - fullName: required, non-empty after trim, ≤ 200 chars
 *  - email:    required, valid email format, ≤ 254 chars
 *  - experience: array of ExperienceEntry, ≤ 50 entries
 *  - education:  array of EducationEntry,  ≤ 50 entries
 *  - skills:     array of strings,         ≤ 50 entries, each ≤ 200 chars
 */
export const resumeDataSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(200, 'Full name must be 200 characters or fewer'),

  email: z
    .string()
    .email('Must be a valid email address')
    .max(254, 'Email must be 254 characters or fewer'),

  phone: z
    .string()
    .max(50, 'Phone must be 50 characters or fewer')
    .default(''),

  location: z
    .string()
    .max(200, 'Location must be 200 characters or fewer')
    .default(''),

  summary: z
    .string()
    .max(2000, 'Summary must be 2,000 characters or fewer')
    .default(''),

  links: z
    .array(
      z.object({
        type: z.enum([
          'website',
          'linkedin',
          'github',
          'leetcode',
          'twitter',
          'dribbble',
          'medium',
          'other',
        ]),
        url: z.string().max(300, 'Link must be 300 characters or fewer'),
      })
    )
    .max(15, 'You may add at most 15 links')
    .default([]),

  experience: z
    .array(experienceEntrySchema)
    .max(50, 'Experience may have at most 50 entries'),

  projects: z
    .array(projectEntrySchema)
    .max(50, 'Projects may have at most 50 entries')
    .default([]),

  education: z
    .array(educationEntrySchema)
    .max(50, 'Education may have at most 50 entries'),

  certifications: z
    .array(certificationEntrySchema)
    .max(50, 'Certifications may have at most 50 entries')
    .default([]),

  skills: z
    .array(
      z.string().max(200, 'Each skill must be 200 characters or fewer')
    )
    .max(50, 'Skills may have at most 50 entries'),

  achievements: z
    .array(z.string().max(500, 'Each achievement must be 500 characters or fewer'))
    .max(50, 'Achievements may have at most 50 entries')
    .default([]),
})

// ─── Validation function ──────────────────────────────────────────────────────

/**
 * Validates `input` against `resumeDataSchema`.
 *
 * On success returns `ok(ResumeData)`.
 * On failure returns `err(ValidationError)` with **all** failing fields
 * collected (Zod evaluates every check — no `abortEarly` needed).
 *
 * The `fields` map is keyed by the dot-notation path of each failing field
 * (e.g. `"fullName"`, `"experience[2].title"`) and the value is an array of
 * human-readable messages for that path.
 */
export function validateResumeData(input: unknown): Result<ResumeData, ValidationError> {
  const result = resumeDataSchema.safeParse(input)

  if (result.success) {
    return ok(result.data as ResumeData)
  }

  // Collect every issue, grouped by dot-path.
  const fields: Record<string, string[]> = {}

  for (const issue of result.error.issues) {
    // Zod represents paths as an array of string | number segments.
    // Convert to dot-notation: ["experience", 0, "title"] → "experience[0].title"
    const path = issue.path
      .map((segment, idx) =>
        typeof segment === 'number'
          ? `[${segment}]`
          : idx === 0
            ? segment
            : `.${segment}`
      )
      .join('')

    const key = path === '' ? '_root' : path

    if (!fields[key]) {
      fields[key] = []
    }
    fields[key].push(issue.message)
  }

  return err({ fields })
}
