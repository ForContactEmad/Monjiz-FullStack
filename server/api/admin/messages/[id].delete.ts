import { z } from 'zod'

/** DELETE /api/admin/messages/:id — permanent deletion. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data, error } = await db.from('contact_messages').delete().eq('id', id).select('id')
  failOn(error, 'delete message')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'delete_message', 'contact_messages', id)
  return { ok: true }
})
