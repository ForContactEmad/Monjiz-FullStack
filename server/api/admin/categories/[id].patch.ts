import { z } from 'zod'

/** PATCH /api/admin/categories/:id — names, descriptions, order, visibility. The slug is fixed. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const input = parseOr400(categoryUpdateSchema, await readBody(event))

  const { data, error } = await db.from('service_categories').update(input).eq('id', id).select('id')
  failOn(error, 'update category')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'update_category', 'service_categories', id)
  return { ok: true }
})
