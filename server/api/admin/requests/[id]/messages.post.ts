import { z } from 'zod'

/** POST /api/admin/requests/:id/messages — the admin replies to the client. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 16 * 1024)
  const { db, adminId } = await requireAdmin(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { body } = parseOr400(messageSchema, await readBody(event))

  const { error } = await db.from('request_messages').insert({
    request_id: requestId,
    sender: 'admin',
    author_id: adminId,
    body,
    read_by_admin: true,
  })
  if (error?.code === '23503') throw createError({ statusCode: 404, statusMessage: 'not_found' })
  failOn(error, 'admin message')

  await audit(adminId, 'reply_to_client', 'service_requests', requestId)
  setResponseStatus(event, 201)
  return { ok: true }
})
