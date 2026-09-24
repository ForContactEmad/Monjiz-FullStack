/**
 * Wires up title, meta description, Open Graph tags, canonical, and
 * hreflang alternates for one page — the pattern agreed on during SEO
 * planning (see the project's chat history / docs/ARCHITECTURE.md).
 *
 * Usage in a page's <script setup>:
 *   useSeoPage({ titleKey: 'home.seo.title', descriptionKey: 'home.seo.description' })
 *
 * Pass noindex: true for pages that must never be indexed (e.g. /dashboard).
 */
export function useSeoPage(options: {
  titleKey: string
  descriptionKey: string
  noindex?: boolean
}) {
  const { t, locale } = useI18n()
  const route = useRoute()
  const config = useRuntimeConfig()

  useSeoMeta({
    title: () => t(options.titleKey),
    ogTitle: () => t(options.titleKey),
    description: () => t(options.descriptionKey),
    ogDescription: () => t(options.descriptionKey),
    ogLocale: () => (locale.value === 'ar' ? 'ar_SA' : 'en_US'),
    robots: () => (options.noindex ? 'noindex, nofollow' : 'index, follow'),
  })

  useHead(() => {
    const siteUrl = config.public.siteUrl as string
    // Strip any existing locale prefix from the current path so we can
    // rebuild a clean per-locale URL for each hreflang alternate below.
    const cleanPath = route.path.replace(/^\/en(?=\/|$)/, '') || '/'

    if (!siteUrl) {
      // No production domain configured yet — skip absolute-URL tags
      // rather than emitting broken/relative canonical or hreflang links.
      return {}
    }

    const arUrl = `${siteUrl}${cleanPath}`
    const enUrl = `${siteUrl}/en${cleanPath === '/' ? '' : cleanPath}`
    const currentUrl = locale.value === 'ar' ? arUrl : enUrl

    return {
      link: [
        { rel: 'canonical', href: currentUrl },
        { rel: 'alternate', hreflang: 'ar', href: arUrl },
        { rel: 'alternate', hreflang: 'en', href: enUrl },
        { rel: 'alternate', hreflang: 'x-default', href: arUrl }, // Arabic is the default locale
      ],
    }
  })
}
