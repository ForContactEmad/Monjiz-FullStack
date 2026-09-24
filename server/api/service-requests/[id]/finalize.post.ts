import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { ATTACHMENTS_BUCKET } from '#shared/uploads'

type PendingUpload = { path: string; name: string; type: string; size: number }

/**
 * POST /api/service-requests/:id/finalize — phase 2.
 * Body: { token } — the one-time token returned by phase 1.
 *
 * For each file the browser uploaded under pending/<id>/: download it,
 * verify it by content (server/utils/attachments.ts), store the cleaned
 * version under <id>/<uuid>.<ext>, and record it in request_attachments.
 * The pending copy is always deleted, accepted or not.
 */
export default defineEventHandler(async (event) => {
  assertSmallBody(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { token } = parseOr400(finalizeSchema, await readBody(event))

  await enforceRateLimit(event, 'finalize_upload', { max: 10, windowMinutes: 60 })

  const supabase = useSupabaseAdmin()
  const tokenHash = sha256(token)

  const { data: request, error } = await supabase
    .from('service_requests')
    .select('id, upload_token_hash, pending_uploads')
    .eq('id', requestId)
    .maybeSingle()
  if (error) {
    console.error('[finalize] lookup failed', error.message)
    throw createError({ statusCode: 500, statusMessage: 'server_error' })
  }

  // Same 404 for "no such request", "no uploads pending" and "wrong
  // token" — the response must not reveal which request IDs exist.
  if (!request?.upload_token_hash || !safeEqualHex(request.upload_token_hash, tokenHash)) {
    throw createError({ statusCode: 404, statusMessage: 'not_found' })
  }

  // Claim the token atomically: the conditional update only succeeds for
  // one caller, so two parallel finalize calls can't both process files.
  const { data: claimed } = await supabase
    .from('service_requests')
    .update({ upload_token_hash: null })
    .eq('id', requestId)
    .eq('upload_token_hash', tokenHash)
    .select('id')
  if (!claimed?.length) throw createError({ statusCode: 409, statusMessage: 'already_finalized' })

  const pending = (request.pending_uploads ?? []) as PendingUpload[]
  const bucket = supabase.storage.from(ATTACHMENTS_BUCKET)
  let accepted = 0
  let rejected = 0

  for (const item of pending) {
    const { data: blob, error: downloadError } = await bucket.download(item.path)
    if (downloadError || !blob) {
      rejected++ // declared but never uploaded
      continue
    }

    const result = await verifyAttachment(Buffer.from(await blob.arrayBuffer()), item.type)
    await bucket.remove([item.path])

    if (!result.ok) {
      console.warn('[finalize] attachment rejected', result.reason)
      rejected++
      continue
    }

    const finalPath = `${requestId}/${randomUUID()}.${result.file.extension}`
    const { error: uploadError } = await bucket.upload(finalPath, result.file.bytes, {
      contentType: result.file.mime,
      upsert: false,
    })
    if (uploadError) {
      console.error('[finalize] store failed', uploadError.message)
      rejected++
      continue
    }

    const { error: rowError } = await supabase.from('request_attachments').insert({
      request_id: requestId,
      storage_path: finalPath,
      original_filename: item.name,
      mime_type: result.file.mime,
      size_bytes: result.file.bytes.byteLength,
    })
    if (rowError) {
      console.error('[finalize] attachment row failed', rowError.message)
      await bucket.remove([finalPath])
      rejected++
      continue
    }
    accepted++
  }

  await supabase.from('service_requests').update({ pending_uploads: null }).eq('id', requestId)

  return { ok: true, accepted, rejected }
})

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
