/** POST /api/admin/testimonials */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const input = parseOr400(testimonialSchema, await readBody(event))

  const { data, error } = await db.from('testimonials').insert(input).select('id').single()
  failOn(error, 'create testimonial')

  await audit(adminId, 'create_testimonial', 'testimonials', data!.id)
  setResponseStatus(event, 201)
  return { ok: true, id: data!.id }
})
