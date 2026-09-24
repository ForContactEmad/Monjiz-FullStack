import type { Category } from '#shared/types/admin'

/** GET /api/admin/categories — all, including hidden ones. */
export default defineEventHandler(async (event): Promise<Category[]> => {
  const { db } = await requireAdmin(event)
  const { data, error } = await db
    .from('service_categories')
    .select('id, slug, name_ar, name_en, description_ar, description_en, sort_order, is_active')
    .order('sort_order')
  failOn(error, 'list categories')
  return data ?? []
})
