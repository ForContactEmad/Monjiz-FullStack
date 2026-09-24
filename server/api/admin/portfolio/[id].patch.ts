import { z } from 'zod'

/** PATCH /api/admin/portfolio/:id */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))
  const input = parseOr400(portfolioSchema, await readBody(event))

  const { data, error } = await db.from('portfolio_items').update(input).eq('id', id).select('id')
  failOn(error, 'update portfolio item')
  if (!data?.length) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  await audit(adminId, 'update_portfolio', 'portfolio_items', id)
  return { ok: true }
})
