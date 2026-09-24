import type { PortfolioItem } from '#shared/types/admin'

/** GET /api/admin/portfolio — all items, published or not. */
export default defineEventHandler(async (event): Promise<PortfolioItem[]> => {
  const { db } = await requireAdmin(event)
  const { data, error } = await db
    .from('portfolio_items')
    .select(PORTFOLIO_COLUMNS)
    .order('sort_order')
    .order('created_at')
  failOn(error, 'list portfolio')
  return (data ?? []).map((row) => toPortfolioItem(db, row as never))
})
