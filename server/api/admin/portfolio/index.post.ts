/** POST /api/admin/portfolio — creates an item; the image is uploaded separately. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const input = parseOr400(portfolioSchema, await readBody(event))

  const { data, error } = await db.from('portfolio_items').insert(input).select('id').single()
  failOn(error, 'create portfolio item')

  await audit(adminId, 'create_portfolio', 'portfolio_items', data!.id)
  setResponseStatus(event, 201)
  return { ok: true, id: data!.id }
})
