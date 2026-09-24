<script setup lang="ts">
import { MESSAGE_STATUSES, type MessageItem, type MessageStatus, type Paginated } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t } = useI18n()
const { request } = useAdminApi()
const format = useFormat()
useHead({ title: () => t('dashboard.messages.title') })

const filterStatus = ref<MessageStatus | ''>('')
const page = ref(1)
const result = ref<Paginated<MessageItem> | null>(null)
const errorKey = ref('')
const pendingDelete = ref<MessageItem | null>(null)
const deleting = ref(false)
const confirmDelete = ref<{ open: () => void; close: () => void } | null>(null)

async function load() {
  errorKey.value = ''
  try {
    result.value = await request<Paginated<MessageItem>>('/api/admin/messages', {
      query: { page: page.value, status: filterStatus.value || undefined },
    })
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
}
onMounted(load)

async function setStatus(message: MessageItem, status: MessageStatus) {
  try {
    await request(`/api/admin/messages/${message.id}`, { method: 'PATCH', body: { status } })
    message.status = status
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
}

function askDelete(message: MessageItem) {
  pendingDelete.value = message
  confirmDelete.value?.open()
}

async function deleteMessage() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await request(`/api/admin/messages/${pendingDelete.value.id}`, { method: 'DELETE' })
    confirmDelete.value?.close()
    await load()
  } catch (err) {
    confirmDelete.value?.close()
    errorKey.value = adminErrorKey(err)
  } finally {
    deleting.value = false
    pendingDelete.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.messages.title') }}</h1>
      <select
        v-model="filterStatus"
        class="field-input max-w-48"
        :aria-label="t('dashboard.messages.allStatuses')"
        @change="page = 1; load()"
      >
        <option value="">{{ t('dashboard.messages.allStatuses') }}</option>
        <option v-for="s in MESSAGE_STATUSES" :key="s" :value="s">{{ t(`dashboard.messageStatus.${s}`) }}</option>
      </select>
    </div>

    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
    <p v-if="result && !result.items.length" class="mt-8 text-center text-sm text-neutral-500">
      {{ t('dashboard.messages.empty') }}
    </p>

    <ul class="mt-5 space-y-3">
      <li v-for="m in result?.items ?? []" :key="m.id" class="rounded-lg bg-surface border border-divider p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span class="font-medium">{{ m.full_name }}</span>
            <span class="ms-2 text-xs text-neutral-500" dir="ltr">{{ m.email }}</span>
          </div>
          <div class="flex items-center gap-2">
            <DashboardStatusBadge :status="m.status" kind="message" />
            <span class="text-xs text-neutral-500">{{ format.date(m.created_at) }}</span>
          </div>
        </div>
        <p class="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{{ m.message }}</p>
        <div class="mt-4 flex flex-wrap gap-2 text-sm">
          <a :href="`mailto:${m.email}`" class="px-3 py-1.5 rounded-sm bg-accent-600 text-white hover:bg-accent-700">
            {{ t('dashboard.messages.reply') }}
          </a>
          <button v-if="m.status === 'new'" type="button" class="px-3 py-1.5 rounded-sm border border-divider" @click="setStatus(m, 'read')">
            {{ t('dashboard.messages.markRead') }}
          </button>
          <button v-if="m.status !== 'replied'" type="button" class="px-3 py-1.5 rounded-sm border border-divider" @click="setStatus(m, 'replied')">
            {{ t('dashboard.messages.markReplied') }}
          </button>
          <button
            type="button"
            class="ms-auto px-3 py-1.5 rounded-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
            @click="askDelete(m)"
          >
            {{ t('dashboard.messages.delete') }}
          </button>
        </div>
      </li>
    </ul>

    <DashboardPaginationBar
      v-if="result"
      class="mt-4"
      :page="result.page"
      :total="result.total"
      :page-size="result.pageSize"
      @change="(p: number) => { page = p; load() }"
    />

    <DashboardConfirmDialog
      ref="confirmDelete"
      :title="t('dashboard.messages.deleteTitle')"
      :body="t('dashboard.messages.deleteBody')"
      :confirm-label="t('dashboard.messages.delete')"
      :busy="deleting"
      @confirm="deleteMessage"
    />
  </div>
</template>
