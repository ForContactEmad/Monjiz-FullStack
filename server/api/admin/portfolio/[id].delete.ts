import { z } from 'zod'

/** DELETE /api/admin/portfolio/:id — removes the image file, then the row. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const { db, adminId } = await requireAdmin(event)
  const id = parseOr400(z.uuid(), getRouterParam(event, 'id'))

  const { data: item, error: getError } = await db
    .from('portfolio_items')
    .select('image_path')
    .eq('id', id)
    .maybeSingle()
  failOn(getError, 'portfolio lookup')
  if (!item) throw createError({ statusCode: 404, statusMessage: 'not_found' })

  if (item.image_path) {
    const { error: removeError } = await db.storage.from(PORTFOLIO_BUCKET).remove([item.image_path])
    failOn(removeError, 'remove portfolio image')
  }
  const { error } = await db.from('portfolio_items').delete().eq('id', id)
  failOn(error, 'delete portfolio item')

  await audit(adminId, 'delete_portfolio', 'portfolio_items', id)
  return { ok: true }
})
