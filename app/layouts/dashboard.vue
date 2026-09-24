<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const localePath = useLocalePath()
const { theme, toggleTheme } = useTheme()
const { request } = useAdminApi()

const otherLocale = computed(() =>
  (locales.value as { code: 'ar' | 'en'; name?: string }[]).find((l) => l.code !== locale.value)
)

const links = [
  { to: '/dashboard', key: 'dashboard.nav.overview', exact: true },
  { to: '/dashboard/requests', key: 'dashboard.nav.requests', exact: false },
  { to: '/dashboard/messages', key: 'dashboard.nav.messages', exact: false },
  { to: '/dashboard/portfolio', key: 'dashboard.nav.portfolio', exact: false },
  { to: '/dashboard/services', key: 'dashboard.nav.services', exact: false },
  { to: '/dashboard/settings', key: 'dashboard.nav.settings', exact: false },
]

const route = useRoute()
function isActive(link: (typeof links)[number]) {
  const target = localePath(link.to)
  return link.exact ? route.path === target : route.path.startsWith(target)
}

async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } finally {
    await navigateTo(localePath('/dashboard/login'))
  }
}
</script>

<template>
  <div class="min-h-screen bg-bg text-text lg:flex">
    <aside class="lg:w-60 lg:min-h-screen bg-surface border-b lg:border-b-0 lg:border-e border-divider flex flex-col">
      <div class="px-5 py-4 flex items-center justify-between lg:block">
        <p class="text-xl font-heading font-bold text-accent-600">{{ t('nav.brand') }}</p>
        <p class="hidden lg:block text-xs text-neutral-500 mt-1">{{ t('dashboard.title') }}</p>
      </div>

      <nav class="flex lg:flex-col gap-1 px-3 pb-3 lg:pb-0 overflow-x-auto" :aria-label="t('dashboard.title')">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="localePath(link.to)"
          class="whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors"
          :class="isActive(link) ? 'bg-accent-100 text-accent-800 font-medium' : 'text-neutral-700 hover:bg-neutral-100'"
          :aria-current="isActive(link) ? 'page' : undefined"
        >
          {{ t(link.key) }}
        </NuxtLink>
      </nav>

      <div class="mt-auto hidden lg:flex flex-col gap-2 p-3 border-t border-divider text-sm">
        <NuxtLink :to="localePath('/')" class="px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100">
          {{ t('dashboard.nav.viewSite') }}
        </NuxtLink>
        <button type="button" class="text-start px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100" @click="toggleTheme">
          {{ theme === 'dark' ? t('actions.lightMode') : t('actions.darkMode') }}
        </button>
        <button
          v-if="otherLocale"
          type="button"
          class="text-start px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100"
          @click="setLocale(otherLocale.code)"
        >
          {{ otherLocale.name }}
        </button>
        <button type="button" class="text-start px-3 py-2 rounded-md text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950" @click="logout">
          {{ t('dashboard.logout') }}
        </button>
      </div>
    </aside>

    <div class="flex-1 min-w-0">
      <!-- Compact controls for small screens (sidebar footer is hidden there) -->
      <div class="lg:hidden flex justify-end gap-2 px-4 pt-3 text-sm">
        <button type="button" class="px-2 py-1 rounded-sm border border-divider" @click="toggleTheme">
          {{ theme === 'dark' ? t('actions.lightMode') : t('actions.darkMode') }}
        </button>
        <button v-if="otherLocale" type="button" class="px-2 py-1 rounded-sm border border-divider" @click="setLocale(otherLocale.code)">
          {{ otherLocale.name }}
        </button>
        <button type="button" class="px-2 py-1 rounded-sm border border-divider text-red-700 dark:text-red-300" @click="logout">
          {{ t('dashboard.logout') }}
        </button>
      </div>
      <main class="max-w-6xl mx-auto px-4 py-6 lg:py-10">
        <slot />
      </main>
    </div>
  </div>
</template>
