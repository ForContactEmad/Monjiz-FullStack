<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const { theme, toggleTheme } = useTheme()

const otherLocale = computed(() =>
  (locales.value as { code: string; name?: string }[]).find((l) => l.code !== locale.value)
)

const navLinks = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.about', to: '/about' },
  { key: 'nav.services', to: '/services' },
  { key: 'nav.portfolio', to: '/portfolio' },
  { key: 'nav.faq', to: '/faq' },
  { key: 'nav.contact', to: '/contact' },
]

const mobileMenuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (mobileMenuOpen.value = false))

// Contact details and license number are edited in the dashboard.
const { site } = await usePublicSite()
const { profile } = await useClientAccount()
const settings = computed(() => site.value.settings)
const whatsappHref = computed(() => (settings.value.whatsapp ? `https://wa.me/${settings.value.whatsapp}` : null))
const year = new Date().getFullYear()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-text">
    <!-- Announcement bar -->
    <div
      v-if="t('announcement.text')"
      class="marquee overflow-hidden bg-accent-600 text-white text-sm py-2"
      role="note"
    >
      <div class="marquee-track" aria-hidden="true">
        <span v-for="n in 6" :key="n" class="px-10 whitespace-nowrap">{{ t('announcement.text') }}</span>
      </div>
      <span class="sr-only">{{ t('announcement.text') }}</span>
    </div>

    <header class="bg-surface border-b border-divider sticky top-0 z-20">
      <div class="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <NuxtLink :to="localePath('/')" class="text-2xl font-heading font-bold text-accent-600">
          {{ t('nav.brand') }}
        </NuxtLink>

        <nav class="hidden lg:flex items-center gap-6" :aria-label="t('nav.home')">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.key"
            :to="localePath(link.to)"
            class="text-sm text-neutral-700 hover:text-accent-600 transition-colors"
            active-class="!text-accent-600 font-medium"
          >
            {{ t(link.key) }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-sm px-2.5 py-1.5 rounded-sm border border-divider hover:border-accent-400"
            :aria-label="t('actions.switchLanguage')"
            @click="otherLocale && setLocale(otherLocale.code as 'ar' | 'en')"
          >
            {{ otherLocale?.name }}
          </button>

          <button
            type="button"
            class="text-sm px-2.5 py-1.5 rounded-sm border border-divider hover:border-accent-400"
            :aria-label="t('actions.toggleTheme')"
            @click="toggleTheme"
          >
            {{ theme === 'dark' ? t('actions.lightMode') : t('actions.darkMode') }}
          </button>

          <NuxtLink
            v-if="profile"
            :to="localePath('/account')"
            class="hidden sm:inline-block text-sm px-3 py-2 rounded-md border border-divider hover:border-accent-400"
          >
            {{ t('account.nav.account') }}
          </NuxtLink>
          <NuxtLink
            v-else
            :to="localePath('/account/login')"
            class="hidden sm:inline-block text-sm px-3 py-2 rounded-md border border-divider hover:border-accent-400"
          >
            {{ t('account.nav.login') }}
          </NuxtLink>

          <NuxtLink
            :to="localePath('/services')"
            class="hidden sm:inline-block text-sm px-4 py-2 rounded-md bg-accent-600 text-white hover:bg-accent-700 transition-colors"
          >
            {{ t('actions.requestService') }}
          </NuxtLink>

          <button
            type="button"
            class="lg:hidden px-2.5 py-1.5 rounded-sm border border-divider"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-menu"
            :aria-label="t('nav.home')"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      </div>

      <nav v-if="mobileMenuOpen" id="mobile-menu" class="lg:hidden border-t border-divider px-4 py-3">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="localePath(link.to)"
          class="block py-2 text-neutral-700 hover:text-accent-600"
        >
          {{ t(link.key) }}
        </NuxtLink>
        <NuxtLink
          :to="localePath(profile ? '/account' : '/account/login')"
          class="block py-2 text-accent-700 font-medium"
        >
          {{ profile ? t('account.nav.account') : t('account.nav.login') }}
        </NuxtLink>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="bg-surface border-t border-divider mt-16">
      <div class="max-w-6xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-3">
        <div>
          <p class="text-2xl font-heading font-bold text-accent-600">{{ t('nav.brand') }}</p>
          <p class="mt-3 text-sm text-neutral-600 max-w-xs">{{ t('footer.description') }}</p>

          <!-- Shown only once a real license number is set in the dashboard -->
          <p
            v-if="settings.freelance_license_number"
            class="mt-4 inline-block text-xs rounded-sm bg-accent-100 text-accent-800 px-3 py-1.5"
          >
            {{ t('footer.verified') }} · {{ t('footer.licenseNumber') }}
            {{ settings.freelance_license_number }}
          </p>
        </div>

        <div>
          <p class="font-heading font-bold mb-3">{{ t('footer.linksTitle') }}</p>
          <ul class="space-y-2 text-sm">
            <li>
              <NuxtLink :to="localePath('/privacy')" class="text-neutral-600 hover:text-accent-600">
                {{ t('footer.privacy') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/terms')" class="text-neutral-600 hover:text-accent-600">
                {{ t('footer.terms') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/faq')" class="text-neutral-600 hover:text-accent-600">
                {{ t('nav.faq') }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <p class="font-heading font-bold mb-3">{{ t('footer.contactTitle') }}</p>
          <ul class="space-y-2 text-sm">
            <li v-if="settings.contact_email">
              <a :href="`mailto:${settings.contact_email}`" class="text-neutral-600 hover:text-accent-600" dir="ltr">
                {{ settings.contact_email }}
              </a>
            </li>
            <li v-if="whatsappHref">
              <a
                :href="whatsappHref"
                target="_blank"
                rel="noopener noreferrer"
                class="text-neutral-600 hover:text-accent-600"
              >
                {{ t('footer.whatsapp') }}
              </a>
            </li>
            <li>
              <NuxtLink :to="localePath('/contact')" class="text-neutral-600 hover:text-accent-600">
                {{ t('nav.contact') }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-divider">
        <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <p>© {{ year }} {{ t('nav.brand') }} — {{ t('footer.rights') }}</p>
          <!-- Discreet on purpose. Hiding the URL isn't the protection —
               password + mandatory 2FA are (docs/SECURITY.md §4). -->
          <NuxtLink :to="localePath('/dashboard/login')" rel="nofollow" class="hover:text-accent-600">
            {{ t('footer.adminLogin') }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
