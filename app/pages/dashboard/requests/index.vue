<script setup lang="ts">
import { REQUEST_STATUSES, type Category, type Paginated, type RequestListItem } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { request } = useAdminApi()
const format = useFormat()
useHead({ title: () => t('dashboard.requests.title') })

// Filters live in the URL, so a filtered view can be bookmarked/refreshed.
const filters = reactive({
  status: (route.query.status as string) ?? '',
  category: (route.query.category as string) ?? '',
  q: (route.query.q as string) ?? '',
  page: Number(route.query.page ?? 1) || 1,
})

const result = ref<Paginated<RequestListItem> | null>(null)
const loading = ref(false)
const errorKey = ref('')

async function load() {
  loading.value = true
  errorKey.value = ''
  const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== 1))
  router.replace({ query })
  try {
    result.value = await request<Paginated<RequestListItem>>('/api/admin/requests', { query: filters })
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  filters.page = 1
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(applyFilters, 350)
  }
)

function goToPage(page: number) {
  filters.page = page
  load()
}

const categories = ref<Category[]>([])
onMounted(async () => {
  load()
  categories.value = await request<Category[]>('/api/admin/categories').catch(() => [])
})

const categoryName = (c: { name_ar: string; name_en: string } | null) =>
  c ? (locale.value === 'ar' ? c.name_ar : c.name_en) : '—'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.requests.title') }}</h1>
      <p v-if="result" class="text-sm text-neutral-500">{{ t('dashboard.requests.total', { count: result.total }) }}</p>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-3">
      <input
        v-model="filters.q"
        type="search"
        :placeholder="t('dashboard.requests.search')"
        :aria-label="t('dashboard.requests.search')"
        class="field-input"
      >
      <select v-model="filters.status" class="field-input" :aria-label="t('dashboard.requests.status')" @change="applyFilters">
        <option value="">{{ t('dashboard.requests.allStatuses') }}</option>
        <option v-for="s in REQUEST_STATUSES" :key="s" :value="s">{{ t(`dashboard.status.${s}`) }}</option>
      </select>
      <select v-model="filters.category" class="field-input" :aria-label="t('dashboard.requests.category')" @change="applyFilters">
        <option value="">{{ t('dashboard.requests.allCategories') }}</option>
        <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ categoryName(c) }}</option>
      </select>
    </div>

    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>

    <div class="mt-5 overflow-x-auto rounded-lg bg-surface border border-divider" :class="{ 'opacity-60': loading }">
      <table class="w-full text-sm">
        <thead class="text-neutral-600 border-b border-divider">
          <tr>
            <th scope="col" class="text-start font-medium px-4 py-3">{{ t('dashboard.requests.client') }}</th>
            <th scope="col" class="text-start font-medium px-4 py-3">{{ t('dashboard.requests.category') }}</th>
            <th scope="col" class="text-start font-medium px-4 py-3">{{ t('dashboard.requests.status') }}</th>
            <th scope="col" class="text-start font-medium px-4 py-3">{{ t('dashboard.requests.files') }}</th>
            <th scope="col" class="text-start font-medium px-4 py-3">{{ t('dashboard.requests.date') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-divider">
          <tr v-for="item in result?.items ?? []" :key="item.id" class="hover:bg-neutral-100">
            <td class="px-4 py-3">
              <NuxtLink :to="localePath(`/dashboard/requests/${item.id}`)" class="font-medium text-accent-700 hover:underline">
                {{ item.full_name }}
              </NuxtLink>
              <span class="block text-xs text-neutral-500" dir="ltr">{{ item.email }}</span>
            </td>
            <td class="px-4 py-3">{{ categoryName(item.category) }}</td>
            <td class="px-4 py-3"><DashboardStatusBadge :status="item.status" /></td>
            <td class="px-4 py-3 tabular-nums">{{ item.attachment_count }}</td>
            <td class="px-4 py-3 whitespace-nowrap text-neutral-600">{{ format.date(item.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="result && !result.items.length" class="px-4 py-8 text-center text-sm text-neutral-500">
        {{ t('dashboard.requests.empty') }}
      </p>
    </div>

    <DashboardPaginationBar
      v-if="result"
      class="mt-4"
      :page="result.page"
      :total="result.total"
      :page-size="result.pageSize"
      @change="goToPage"
    />
  </div>
</template>
