import type { PortfolioItem } from '#shared/types/admin'

/**
 * GET /api/public/portfolio — published portfolio items with their public
 * image URLs. Anon key + RLS: unpublished items are never returned.
 */
export default defineEventHandler(async (event): Promise<PortfolioItem[]> => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  try {
    const db = createAuthClient()
    const { data, error } = await db
      .from('portfolio_items')
      .select(PORTFOLIO_COLUMNS)
      .order('sort_order')
      .order('created_at')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => toPortfolioItem(db, row as never))
  } catch (err) {
    console.error('[public/portfolio] falling back to empty list:', (err as Error).message)
    return []
  }
})
