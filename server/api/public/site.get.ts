import type { PublicSiteData, SiteSettings } from '#shared/types/admin'

const EMPTY_SETTINGS: SiteSettings = {
  orders_completed: null,
  years_experience: null,
  freelance_license_number: null,
  contact_email: null,
  whatsapp: null,
}

/**
 * GET /api/public/site — everything the public pages need from the
 * database: settings, published testimonials, active categories.
 *
 * Read with the ANON key, so Row Level Security decides what is visible
 * (published / active rows only). If the database is unreachable the site
 * still renders, just without these sections — a public page must never
 * crash because of this call.
 */
export default defineEventHandler(async (event): Promise<PublicSiteData> => {
  // Short shared cache: edits show up within a minute, and a traffic spike
  // doesn't hit the database once per visitor.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')

  try {
    const db = createAuthClient()
    const [settings, testimonials, categories] = await Promise.all([
      db
        .from('site_settings')
        .select('orders_completed, years_experience, freelance_license_number, contact_email, whatsapp')
        .eq('id', 1)
        .maybeSingle(),
      db.from('testimonials').select('id, name, text').order('sort_order').order('created_at'),
      db
        .from('service_categories')
        .select('slug, name_ar, name_en, description_ar, description_en')
        .eq('is_active', true)
        .order('sort_order'),
    ])
    for (const r of [settings, testimonials, categories]) {
      if (r.error) throw new Error(r.error.message)
    }
    return {
      settings: settings.data ?? EMPTY_SETTINGS,
      testimonials: testimonials.data ?? [],
      categories: categories.data ?? [],
    }
  } catch (err) {
    console.error('[public/site] falling back to empty data:', (err as Error).message)
    return { settings: EMPTY_SETTINGS, testimonials: [], categories: [] }
  }
})
