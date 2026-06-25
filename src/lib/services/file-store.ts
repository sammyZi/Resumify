/**
 * file-store.ts — File_Store: Supabase Storage adapter for PDF artefacts.
 *
 * Server-only module. Uses the service-role client to operate against the
 * private 'resumes' bucket, bypassing any storage RLS policies that would
 * otherwise reject the upload.
 *
 * Requirements: 7.2, 7.3
 */

import 'server-only'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { ok, err, type Result, type AppError } from '@/lib/result'

// ─── putPdf ──────────────────────────────────────────────────────────────────

/**
 * Uploads a compiled PDF to the private 'resumes' Storage bucket.
 *
 * `path` should be a relative storage path, e.g. `resumes/{userId}/{resumeId}.pdf`.
 * Uses `upsert: true` so re-compiling overwrites the previous file.
 *
 * Requirements: 7.2
 */
export async function putPdf(
  path: string,
  pdf: Uint8Array
): Promise<Result<{ path: string }, AppError>> {
  const supabase = createSupabaseServiceClient()

  const { error } = await supabase.storage
    .from('resumes')
    .upload(path, pdf, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    return err({
      code: 'storage_upload_failed',
      message: error.message,
    })
  }

  return ok({ path })
}

// ─── getSignedDownloadUrl ─────────────────────────────────────────────────────

/**
 * Creates a short-lived signed URL for downloading a PDF from the private bucket.
 *
 * `ttlSeconds` controls how long the URL remains valid (e.g. 300 = 5 minutes).
 *
 * Requirements: 7.3
 */
export async function getSignedDownloadUrl(
  path: string,
  ttlSeconds: number
): Promise<Result<string, AppError>> {
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(path, ttlSeconds)

  if (error || !data?.signedUrl) {
    return err({
      code: 'signed_url_failed',
      message: error?.message ?? 'Failed to generate signed URL',
    })
  }

  return ok(data.signedUrl)
}
