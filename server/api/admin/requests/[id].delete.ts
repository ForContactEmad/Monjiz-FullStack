import { z } from 'zod'
import { ATTACHMENTS_BUCKET } from '#shared/uploads'

/**
 * DELETE /api/admin/requests/:id — permanent deletion (PDPL right to
 * erasure). Removes stored files first, then the row; request_attachments
 * rows go with it via ON DELETE CASCADE. Not a soft delete: nothing is
 * recoverable afterwards, by design.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data: attachments, error: attError } = await db
    .from('request_attachments')
    .select('storage_path')
    .eq('request_id', id)
  failOn(attError, 'delete: list attachments')

  const bucket = db.storage.from(ATTACHMENTS_BUCKET)
  // Also sweep any never-finalized uploads for this request.
  const { data: pending } = await bucket.list(`pending/${id}`)
  const paths = [
    ...(attachments ?? []).map((a) => a.storage_path as string),
    ...(pending ?? []).map((p) => `pending/${id}/${p.name}`),
  ]
  if (paths.length) {
    const { error: removeError } = await bucket.remove(paths)
    failOn(removeError, 'delete: remove files')
  }

  const { data, error } = await db.from('service_requests').delete().eq('id', id).select('id')
  failOn(error, 'delete request')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'delete_request', 'service_requests', id)
  return { ok: true }
})
