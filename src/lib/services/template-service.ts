/**
 * template-service.ts — Template_Service: applies a template to a resume.
 *
 * Templates themselves are predefined in code (see lib/templates/registry).
 * This service only persists the user's template choice onto the resume row.
 *
 * Server-only module. Uses the cookie-bound Supabase client (anon key, RLS-enforced).
 *
 * Requirements: 4.3, 4.4
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result, type AppError } from '@/lib/result'
import { isKnownTemplate } from '@/lib/templates/registry'

// ─── applyTemplate ────────────────────────────────────────────────────────────

/**
 * Associates `templateId` with the resume identified by `resumeId`.
 *
 * The update is RLS-enforced: only the resume owner can apply a template to
 * their own resume. If the update fails (DB error or RLS rejection), the
 * previously associated template is retained — no rollback is needed because
 * the update never went through.
 *
 * Returns `ok(undefined)` on success, or `err({ code, message })` on failure
 * (including an unknown template id).
 *
 * Requirements: 4.3, 4.4
 */
export async function applyTemplate(
  resumeId: string,
  templateId: string
): Promise<Result<void, AppError>> {
  if (!isKnownTemplate(templateId)) {
    return err({ code: 'unknown_template', message: 'Unknown template id' })
  }

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
