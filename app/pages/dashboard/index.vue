<script setup lang="ts">
import { REQUEST_STATUSES, type DashboardStats } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { request } = useAdminApi()
const format = useFormat()
useHead({ title: () => t('dashboard.overview.title') })

const stats = ref<DashboardStats | null>(null)
const errorKey = ref('')

onMounted(async () => {
  try {
    stats.value = await request<DashboardStats>('/api/admin/stats')
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
})

const categoryName = (c: { name_ar: string; name_en: string } | null) =>
  c ? (locale.value === 'ar' ? c.name_ar : c.name_en) : '—'
</script>

<template>
  <div>
    <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.overview.title') }}</h1>
    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>

    <template v-if="stats">
      <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <NuxtLink
          v-for="status in REQUEST_STATUSES"
          :key="status"
          :to="{ path: localePath('/dashboard/requests'), query: { status } }"
          class="rounded-lg bg-surface border border-divider p-4 hover:border-accent-400 transition-colors"
        >
          <p class="text-3xl font-heading font-bold">{{ stats.requestsByStatus[status] }}</p>
          <DashboardStatusBadge :status="status" class="mt-2" />
        </NuxtLink>
        <NuxtLink
          :to="localePath('/dashboard/messages')"
          class="rounded-lg bg-accent-600 text-white p-4 hover:bg-accent-700 transition-colors"
        >
          <p class="text-3xl font-heading font-bold">{{ stats.newMessages }}</p>
          <p class="mt-2 text-sm">{{ t('dashboard.overview.newMessages') }}</p>
        </NuxtLink>
      </div>

      <section class="mt-10">
        <div class="flex items-end justify-between mb-3">
          <h2 class="text-lg font-heading font-bold">{{ t('dashboard.overview.recent') }}</h2>
          <NuxtLink :to="localePath('/dashboard/requests')" class="text-sm text-accent-600 hover:underline">
            {{ t('dashboard.overview.viewAll') }}
          </NuxtLink>
        </div>
        <p v-if="!stats.recent.length" class="text-sm text-neutral-500">{{ t('dashboard.overview.empty') }}</p>
        <ul v-else class="divide-y divide-divider rounded-lg bg-surface border border-divider">
          <li v-for="item in stats.recent" :key="item.id">
            <NuxtLink
              :to="localePath(`/dashboard/requests/${item.id}`)"
              class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-100"
            >
              <span class="font-medium">{{ item.full_name }}</span>
              <span class="text-sm text-neutral-600">{{ categoryName(item.category) }}</span>
              <DashboardStatusBadge :status="item.status" />
              <span class="text-xs text-neutral-500">{{ format.date(item.created_at) }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
