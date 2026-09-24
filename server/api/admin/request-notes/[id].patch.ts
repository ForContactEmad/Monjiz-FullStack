import { z } from 'zod'

/** PATCH /api/admin/request-notes/:id — edits a note's text. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const { body } = parseOr400(requestNoteSchema, await readBody(event))

  const { data, error } = await db.from('request_notes').update({ body }).eq('id', id).select('request_id')
  failOn(error, 'update note')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'edit_note', 'service_requests', data[0]!.request_id)
  return { ok: true }
})
