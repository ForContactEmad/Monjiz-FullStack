import { z } from 'zod'

/** PATCH /api/admin/testimonials/:id — full replacement of editable fields. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const input = parseOr400(testimonialSchema, await readBody(event))

  const { data, error } = await db.from('testimonials').update(input).eq('id', id).select('id')
  failOn(error, 'update testimonial')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'update_testimonial', 'testimonials', id)
  return { ok: true }
})
