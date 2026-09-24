import type { Testimonial } from '#shared/types/admin'

/** GET /api/admin/testimonials — all, published or not. */
export default defineEventHandler(async (event): Promise<Testimonial[]> => {
  const { db } = await requireAdmin(event)
  const { data, error } = await db
    .from('testimonials')
    .select('id, name, text, sort_order, is_published')
    .order('sort_order')
    .order('created_at')
  failOn(error, 'list testimonials')
  return data ?? []
})
