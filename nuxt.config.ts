import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },

  // Explicit, even though it is Nuxt 4's default: makes `~` resolve to
  // app/ no matter which Nuxt major is installed, which is what the
  // "Cannot find module '~/assets/css/main.css'" error was about.
  srcDir: 'app',
  serverDir: 'server',

  modules: ['@nuxtjs/i18n', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    // Overridden per-request by @nuxtjs/i18n based on the active locale —
    // this is just the fallback for the very first paint.
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap',
        },
      ],
      meta: [{ name: 'theme-color', content: '#44498e' }],
      script: [
        {
          // Runs before Vue mounts/hydrates so the correct theme is set on
          // the very first paint — prevents a flash of the wrong theme.
          // Renamed from the original design's `mirfaq-theme` key.
          innerHTML: `(function(){try{var t=localStorage.getItem('monjiz-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          tagPosition: 'head',
        },
      ],
    },
  },

  i18n: {
    locales: [
      { code: 'ar', iso: 'ar-SA', dir: 'rtl', name: 'العربية', file: 'ar.json' },
      { code: 'en', iso: 'en-US', dir: 'ltr', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'ar',
    // Arabic stays unprefixed ("/services"), English gets "/en/services" —
    // matches the convention already used on the author's portfolio site.
    strategy: 'prefix_except_default',
    langDir: 'locales/',
    detectBrowserLanguage: false, // explicit choice: Arabic is the business default, not browser-sniffed
  },

  // Server-only secrets under runtimeConfig (never under `public`).
  // See docs/SECURITY.md — service_role and Resend keys are used exclusively
  // inside server/api/*.ts routes, never sent to the client bundle.
  runtimeConfig: {
    supabaseServiceRoleKey: '', // NUXT_SUPABASE_SERVICE_ROLE_KEY
    resendApiKey: '', // NUXT_RESEND_API_KEY
    notifyEmail: '', // NUXT_NOTIFY_EMAIL — where "new request" alerts go
    notifyFrom: '', // NUXT_NOTIFY_FROM — sender on a Resend-verified domain
    rateLimitSalt: '', // NUXT_RATE_LIMIT_SALT — long random string, never shared
    public: {
      supabaseUrl: '', // NUXT_PUBLIC_SUPABASE_URL
      supabaseAnonKey: '', // NUXT_PUBLIC_SUPABASE_ANON_KEY — read-only public data only
      // Used to build absolute canonical/hreflang URLs (see composables/useSeoPage.ts).
      // Set to the real production domain before launch; falls back gracefully if empty.
      siteUrl: '', // NUXT_PUBLIC_SITE_URL, e.g. https://monjiz.com
    },
  },

  // Security headers on every response. CSP is intentionally not set yet:
  // Nuxt injects inline scripts (hydration payload, theme bootstrap), so a
  // strict CSP needs nonces — handled in the deployment step (README step 7).
  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    },
    // Dashboard: client-rendered only (no SEO value, and it avoids
    // forwarding auth cookies during server rendering), never indexed.
    '/dashboard/**': { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/en/dashboard/**': { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    // Admin & auth responses carry personal data or session state.
    '/api/admin/**': { headers: { 'Cache-Control': 'no-store' } },
    '/api/auth/**': { headers: { 'Cache-Control': 'no-store' } },
  },

  typescript: { strict: true },
})
