/**
 * template-service.ts — Template_Service: business logic for template operations.
 *
 * Server-only module. Uses the cookie-bound Supabase client (anon key, RLS-enforced).
 *
 * Key behaviours:
 *  - listTemplates: returns all templates, optionally filtered by role category.
 *  - getDefaultTemplate: returns the single template marked as the default.
 *  - applyTemplate: associates a template with a resume (RLS-enforced owner-only update).
 *
 * All functions return typed values or Result<T,E> — they never throw.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result, type AppError } from '@/lib/result'
import type { Template } from '@/lib/types'

// ─── Row shape returned by Supabase ──────────────────────────────────────────

type TemplateRow = {
  id: string
  name: string
  role_category: string
  preview_path: string
  latex_scaffold: string
  is_default: boolean
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    roleCategory: row.role_category,
    previewPath: row.preview_path,
    latexScaffold: row.latex_scaffold,
    isDefault: row.is_default,
  }
}

// ─── listTemplates ────────────────────────────────────────────────────────────

/**
 * Returns all templates, optionally filtered by an exact `roleCategory` match.
 *
 * When `roleCategory` is provided, only templates whose `role_category` column
 * equals that value exactly are returned (no partial/fuzzy matching).
 *
 * Returns an empty array on DB error — callers receive a graceful degradation
 * rather than a thrown exception.
 *
 * Requirements: 4.6, 4.7
 */
export async function listTemplates(roleCategory?: string): Promise<Template[]> {
  const supabase = await createSupabaseServerClient()

  let query = supabase.from('templates').select('*')

  if (roleCategory !== undefined) {
    query = query.eq('role_category', roleCategory)
  }

  const { data, error } = await query

  if (error) {
    return []
  }

  return (data as TemplateRow[]).map(rowToTemplate)
}

// ─── getDefaultTemplate ───────────────────────────────────────────────────────

/**
 * Returns the single template row where `is_default = true`.
 *
 * Returns `null` when no default template is configured or on DB error.
 *
 * Requirements: 4.5
 */
export async function getDefaultTemplate(): Promise<Template | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('is_default', true)
    .single()

  if (error) {
    return null
  }

  return rowToTemplate(data as TemplateRow)
}

// ─── applyTemplate ────────────────────────────────────────────────────────────

/**
 * Associates `templateId` with the resume identified by `resumeId`.
 *
 * The update is RLS-enforced: only the resume owner can apply a template to
 * their own resume. If the update fails (DB error or RLS rejection), the
 * previously associated template is retained — no rollback is needed because
 * the update never went through.
 *
 * Returns `ok(undefined)` on success, or `err({ code, message })` on failure.
 *
 * Requirements: 4.3, 4.4
 */
export async function applyTemplate(
  resumeId: string,
  templateId: string
): Promise<Result<void, AppError>> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('resumes')
    .update({ template_id: templateId })
    .eq('id', resumeId)

  if (error) {
    return err({ code: error.code ?? 'unknown', message: error.message })
  }

  return ok(undefined)
}
