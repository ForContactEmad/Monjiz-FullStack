import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ATTACHMENTS_BUCKET, MAX_ATTACHMENTS_PER_REQUEST } from '#shared/uploads'

/**
 * POST /api/client/requests/:id/attachments — phase 1 of adding files to a
 * request the client already submitted.
 *
 * Same two-phase design as the public form (Vercel caps request bodies at
 * 4.5 MB): the server hands out one signed upload URL per declared file,
 * the browser uploads straight to the private bucket, then calls
 * .../attachments/finalize so the server can verify the bytes.
 *
 * Ownership is checked with the CLIENT's own token, so RLS decides — a
 * request belonging to someone else simply isn't found.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event)
  const { db, userId } = await requireClient(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { files } = parseOr400(clientAttachmentsInitSchema, await readBody(event))

  await enforceRateLimit(event, 'client_attach', { max: 20, windowMinutes: 60 })

  const { data: request, error } = await db
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .maybeSingle()
  failOn(error, 'client attach: request lookup')
  if (!request) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  // A request can't grow without limit, however many times files are added.
  const { count, error: countError } = await db
    .from('request_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId)
  failOn(countError, 'client attach: count')
  if ((count ?? 0) + files.length > MAX_ATTACHMENTS_PER_REQUEST) {
    throw createError({ statusCode: 409, statusMessage: 'attachment_limit' })
  }

  const admin = useSupabaseAdmin()
  const uploads: { path: string; token: string; name: string; type: string }[] = []
  for (const file of files) {
    // The path is generated here and scoped to this request — never taken
    // from the browser.
    const path = `pending/${requestId}/${randomUUID()}`
    const { data, error: urlError } = await admin.storage.from(ATTACHMENTS_BUCKET).createSignedUploadUrl(path)
    if (urlError || !data) {
      console.error('[client attach] signed upload url failed', urlError?.message)
      throw createError({ statusCode: 500, statusMessage: 'server_error' })
    }
    uploads.push({ path: data.path, token: data.token, name: file.name, type: file.type })
  }

  console.info(`[client attach] ${uploads.length} upload slot(s) issued for request ${requestId} by ${userId}`)
  return { uploads }
})
