import { z } from 'zod'

/** DELETE /api/admin/request-notes/:id */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data, error } = await db.from('request_notes').delete().eq('id', id).select('request_id')
  failOn(error, 'delete note')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'delete_note', 'service_requests', data[0]!.request_id)
  return { ok: true }
})
