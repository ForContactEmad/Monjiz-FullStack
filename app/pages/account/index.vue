<script setup lang="ts">
import type { ClientRequestListItem } from '#shared/types/client'

definePageMeta({ middleware: 'client' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const format = useFormat()
useSeoPage({ titleKey: 'account.requests.title', descriptionKey: 'account.requests.title', noindex: true })

const { data: requests } = await useFetch<ClientRequestListItem[]>('/api/client/requests', {
  key: 'client-requests',
  default: () => [],
})

const { profile, refresh } = await useClientAccount()

async function signOut() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } finally {
    await refresh()
    await navigateTo(localePath('/'))
  }
}

const categoryName = (c: ClientRequestListItem['category']) =>
  c ? (locale.value === 'ar' ? c.name_ar : c.name_en) : '—'
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-16">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-heading font-bold">{{ t('account.requests.title') }}</h1>
      <div class="flex items-center gap-3">
        <NuxtLink :to="localePath('/services')" class="btn-primary">{{ t('account.requests.newRequest') }}</NuxtLink>
        <button type="button" class="text-sm text-neutral-600 hover:text-accent-600" @click="signOut">
          {{ t('account.nav.logout') }}
        </button>
      </div>
    </div>
    <p v-if="profile" class="mt-1 text-sm text-neutral-500">{{ profile.full_name }}</p>

    <p v-if="!requests?.length" class="mt-10 text-center text-neutral-500">{{ t('account.requests.empty') }}</p>

    <ul v-else class="mt-8 space-y-3">
      <li v-for="item in requests" :key="item.id">
        <NuxtLink
          :to="localePath(`/account/requests/${item.id}`)"
          class="block rounded-lg bg-surface border border-divider p-5 hover:border-accent-400 transition-colors"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-medium">{{ categoryName(item.category) }}</span>
            <span class="flex items-center gap-2">
              <span
                v-if="item.unread_messages"
                class="rounded-sm bg-accent-600 text-white px-2 py-0.5 text-xs"
              >
                {{ item.unread_messages }} {{ t('account.requests.unread') }}
              </span>
              <DashboardStatusBadge :status="item.status" />
            </span>
          </div>
          <dl class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt class="text-neutral-500">{{ t('account.requests.date') }}</dt>
              <dd>{{ format.date(item.created_at, 'date') }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500">{{ t('account.requests.price') }}</dt>
              <dd>{{ item.quoted_price === null ? t('account.requests.noValue') : item.quoted_price }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500">{{ t('account.requests.due') }}</dt>
              <dd>{{ item.due_date ? format.date(item.due_date, 'date') : t('account.requests.noValue') }}</dd>
            </div>
          </dl>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
