import type { PublicSiteData } from '#shared/types/admin'

const EMPTY: PublicSiteData = {
  settings: {
    orders_completed: null,
    years_experience: null,
    freelance_license_number: null,
    contact_email: null,
    whatsapp: null,
  },
  testimonials: [],
  categories: [],
}

/**
 * Site data managed from the dashboard (settings, testimonials, active
 * categories). The fixed key makes every component on a page share ONE
 * request; awaiting it lets server rendering include the data, so it's in
 * the HTML search engines see.
 */
export async function usePublicSite() {
  const { locale } = useI18n()
  const { data } = await useFetch<PublicSiteData>('/api/public/site', {
    key: 'public-site',
    default: () => EMPTY,
  })

  const site = computed(() => data.value ?? EMPTY)
  const categories = computed(() =>
    site.value.categories.map((c) => ({
      slug: c.slug,
      title: locale.value === 'ar' ? c.name_ar : c.name_en,
      description: (locale.value === 'ar' ? c.description_ar : c.description_en) ?? '',
    }))
  )

  return { site, categories }
}
