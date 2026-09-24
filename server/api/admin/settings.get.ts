import type { SiteSettings } from '#shared/types/admin'

/** GET /api/admin/settings */
export default defineEventHandler(async (event): Promise<SiteSettings> => {
  const { db } = await requireAdmin(event)
  const { data, error } = await db
    .from('site_settings')
    .select('orders_completed, years_experience, freelance_license_number, contact_email, whatsapp')
    .eq('id', 1)
    .single()
  failOn(error, 'get settings')
  return data as SiteSettings
})
