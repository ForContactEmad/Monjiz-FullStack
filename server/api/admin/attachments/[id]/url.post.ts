import { z } from 'zod'
import { ATTACHMENTS_BUCKET } from '#shared/uploads'

/** Seconds a generated link stays valid. Short on purpose. */
const SIGNED_URL_TTL = 60

/**
 * POST /api/admin/attachments/:id/url — a short-lived link to open one
 * attachment. POST (not GET) so the link isn't created by prefetching or
 * cached, and every access is audited.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data: attachment, error } = await db
    .from('request_attachments')
    .select('storage_path, original_filename, request_id')
    .eq('id', id)
    .maybeSingle()
  failOn(error, 'attachment lookup')
  if (!attachment) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const { data, error: urlError } = await db.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL, { download: attachment.original_filename })
  failOn(urlError, 'signed url')

  await audit(adminId, 'open_attachment', 'request_attachments', id)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { url: data!.signedUrl, expiresIn: SIGNED_URL_TTL }
})
