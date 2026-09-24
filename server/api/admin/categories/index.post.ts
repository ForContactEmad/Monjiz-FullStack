/**
 * POST /api/admin/categories
 * Categories are never deleted, only hidden (is_active = false): existing
 * requests and portfolio items keep pointing at them.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const input = parseOr400(categoryCreateSchema, await readBody(event))

  const { data, error } = await db.from('service_categories').insert(input).select('id').single()
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'slug_taken' })
  failOn(error, 'create category')

  await audit(adminId, 'create_category', 'service_categories', data!.id)
  setResponseStatus(event, 201)
  return { ok: true, id: data!.id }
})
