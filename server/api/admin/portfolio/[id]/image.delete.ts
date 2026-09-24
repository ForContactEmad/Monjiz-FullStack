import { z } from 'zod'

/**
 * DELETE /api/admin/portfolio/:id/image — removes the uploaded file.
 * The item keeps its external CDN link (if set), which then becomes the
 * image shown on the site.
 */
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
  const { error } = await db.from('portfolio_items').update({ image_path: null }).eq('id', id)
  failOn(error, 'clear portfolio image')

  await audit(adminId, 'remove_portfolio_image', 'portfolio_items', id)
  return { ok: true }
})
