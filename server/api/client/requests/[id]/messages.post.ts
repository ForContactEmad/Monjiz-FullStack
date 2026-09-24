import { z } from 'zod'

/**
 * POST /api/client/requests/:id/messages — the client writes to the admin.
 * The insert policy (migration 0008) independently checks that the request
 * is theirs, that sender is 'client', and that author_id is their own id.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  assertSmallBody(event, 16 * 1024)
  const { db, userId } = await requireClient(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { body } = parseOr400(messageSchema, await readBody(event))

  await enforceRateLimit(event, 'client_message', { max: 30, windowMinutes: 60 })

  const { error } = await db.from('request_messages').insert({
    request_id: requestId,
    sender: 'client',
    author_id: userId,
    body,
    read_by_client: true,
  })
  // RLS refuses a request that isn't theirs: report it as "not found".
  if (error?.code === '42501') throw createError({ statusCode: 404, statusMessage: 'not_found' })
  failOn(error, 'client message')

  await notifyAdmin('Monjiz: new client message', 'A client replied on a request. Open the dashboard to read it.')
  setResponseStatus(event, 201)
  return { ok: true }
})
