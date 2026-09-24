import { z } from 'zod'

/** DELETE /api/admin/testimonials/:id */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data, error } = await db.from('testimonials').delete().eq('id', id).select('id')
  failOn(error, 'delete testimonial')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'delete_testimonial', 'testimonials', id)
  return { ok: true }
})
