import { z } from 'zod'

/** POST /api/admin/requests/:id/notes — adds a dated note to a request. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const requestId = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { body } = parseOr400(requestNoteSchema, await readBody(event))

  const { data, error } = await db
    .from('request_notes')
    .insert({ request_id: requestId, admin_id: adminId, body })
    .select('id')
    .single()
  // A note for a request that doesn't exist is rejected by the foreign key.
  if (error?.code === '23503') throw createError({ statusCode: 404, statusMessage: 'not_found' })
  failOn(error, 'create note')

  await audit(adminId, 'add_note', 'service_requests', requestId)
  setResponseStatus(event, 201)
  return { ok: true, id: data!.id }
})
