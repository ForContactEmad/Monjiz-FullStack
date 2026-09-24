import { z } from 'zod'
import { ATTACHMENTS_BUCKET } from '#shared/uploads'

const SIGNED_URL_TTL = 60

/**
 * POST /api/client/attachments/:id/url — a 60-second link to a file the
 * client attached to their own request.
 *
 * Ownership is checked with the CLIENT's own token (RLS), and only then is
 * the link generated with the service key — the storage bucket itself has
 * no client-facing policy, so this route is the only path in.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db } = await requireClient(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data: attachment, error } = await db
    .from('request_attachments')
    .select('storage_path, original_filename')
    .eq('id', id)
    .maybeSingle()
  failOn(error, 'client attachment lookup')
  if (!attachment) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  const { data, error: urlError } = await useSupabaseAdmin()
    .storage.from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL, { download: attachment.original_filename })
  failOn(urlError, 'client signed url')

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { url: data!.signedUrl, expiresIn: SIGNED_URL_TTL }
})
