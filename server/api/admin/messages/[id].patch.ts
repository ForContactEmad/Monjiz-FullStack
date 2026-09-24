import { z } from 'zod'

/** PATCH /api/admin/messages/:id — body { status }. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { status } = parseOr400(messageStatusSchema, await readBody(event))

  const { data, error } = await db.from('contact_messages').update({ status }).eq('id', id).select('id')
  failOn(error, 'update message')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, `set_status:${status}`, 'contact_messages', id)
  return { ok: true }
})
