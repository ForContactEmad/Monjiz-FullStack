import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ATTACHMENTS_BUCKET, MAX_ATTACHMENTS_PER_REQUEST } from '#shared/uploads'

/**
 * POST /api/client/requests/:id/attachments/finalize — phase 2.
 *
 * Downloads each freshly uploaded file, verifies it by its CONTENT (real
 * type, size, image re-encoding that strips EXIF/GPS), stores the clean
 * copy, and records it. The pending copy is always removed, accepted or
 * not. Files that fail are simply dropped and reported back.
 *
 * Two things make this safe to do with the service key at the end:
 *   • ownership of the request is checked first with the client's token,
 *   • the path must sit under pending/<request id>/, so a client cannot
 *     point this at somebody else's upload.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event)
  const { db } = await requireClient(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { files } = parseOr400(clientAttachmentsFinalizeSchema, await readBody(event))

  const { data: request, error } = await db
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .maybeSingle()
  failOn(error, 'client finalize: request lookup')
  if (!request) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const { count } = await db
    .from('request_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)
  let remaining = MAX_ATTACHMENTS_PER_REQUEST - (count ?? 0)

  const bucket = useSupabaseAdmin().storage.from(ATTACHMENTS_BUCKET)
  const prefix = `pending/${requestId}/`
  let accepted = 0
  let rejected = 0

  for (const file of files) {
    if (!file.path.startsWith(prefix)) {
      rejected++
      continue
    }
    const { data: blob, error: downloadError } = await bucket.download(file.path)
    if (downloadError || !blob) {
      rejected++
      continue
    }

    const result = await verifyAttachment(Buffer.from(await blob.arrayBuffer()), file.type)
    await bucket.remove([file.path])

    if (!result.ok || remaining <= 0) {
      if (!result.ok) console.warn('[client finalize] rejected:', result.reason)
      rejected++
      continue
    }

    const finalPath = `${requestId}/${randomUUID()}.${result.file.extension}`
    const { error: uploadError } = await bucket.upload(finalPath, result.file.bytes, {
      contentType: result.file.mime,
      upsert: false,
    })
    if (uploadError) {
      console.error('[client finalize] store failed', uploadError.message)
      rejected++
      continue
    }

    // Inserted with the service key on purpose: request_attachments has no
    // client insert policy, so a client can never write a row pointing at
    // a file that isn't theirs.
    const { error: rowError } = await useSupabaseAdmin().from('request_attachments').insert({
      request_id: requestId,
      storage_path: finalPath,
      original_filename: sanitizeDisplayName(file.name),
      mime_type: result.file.mime,
      size_bytes: result.file.bytes.byteLength,
    })
    if (rowError) {
      console.error('[client finalize] row failed', rowError.message)
      await bucket.remove([finalPath])
      rejected++
      continue
    }
    accepted++
    remaining--
  }

  return { ok: true, accepted, rejected }
})
