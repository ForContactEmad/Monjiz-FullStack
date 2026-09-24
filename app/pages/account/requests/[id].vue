<script setup lang="ts">
import type { ClientRequestDetail } from '#shared/types/client'
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachmentType,
} from '#shared/uploads'

definePageMeta({ middleware: 'client' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const format = useFormat()
useSeoPage({ titleKey: 'account.requests.details', descriptionKey: 'account.requests.details', noindex: true })

const id = route.params.id as string
const { data: item, refresh } = await useFetch<ClientRequestDetail>(`/api/client/requests/${id}`, {
  key: `client-request-${id}`,
})

const messageBody = ref('')
const sending = ref(false)
const errorKey = ref('')

async function sendMessage() {
  const body = messageBody.value.trim()
  if (!body) return
  sending.value = true
  errorKey.value = ''
  try {
    await $fetch(`/api/client/requests/${id}/messages`, { method: 'POST', body: { body } })
    messageBody.value = ''
    await refresh()
  } catch (err) {
    errorKey.value = accountErrorKey(err)
  } finally {
    sending.value = false
  }
}

const openingId = ref<string | null>(null)

/** Opens one of the client's own attachments through a 60-second link. */
async function openAttachment(attachmentId: string) {
  openingId.value = attachmentId
  const tab = window.open('about:blank', '_blank')
  try {
    const { url } = await $fetch<{ url: string }>(`/api/client/attachments/${attachmentId}/url`, { method: 'POST' })
    if (tab) {
      tab.opener = null
      tab.location.href = url
    }
  } catch (err) {
    tab?.close()
    errorKey.value = accountErrorKey(err)
  } finally {
    openingId.value = null
  }
}

// ------------------------------------------------- adding more files later
const acceptTypes = Object.keys(ALLOWED_ATTACHMENT_TYPES).join(',')
const newFiles = ref<File[]>([])
const uploading = ref(false)
const uploadError = ref('')
const uploadDone = ref<{ accepted: number; rejected: number } | null>(null)

const remainingSlots = computed(() => MAX_ATTACHMENTS_PER_REQUEST - (item.value?.attachments.length ?? 0))

/** Same checks as the request form; the server re-verifies every file. */
function onFilesSelected(event: Event) {
  uploadError.value = ''
  uploadDone.value = null
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  input.value = ''

  if (selected.length + newFiles.value.length > Math.min(MAX_ATTACHMENTS, remainingSlots.value)) {
    uploadError.value = t('account.attachments.tooMany')
    return
  }
  for (const f of selected) {
    if (!isAllowedAttachmentType(f.type)) {
      uploadError.value = t('account.attachments.badType')
      return
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      uploadError.value = t('account.attachments.tooLarge')
      return
    }
  }
  newFiles.value.push(...selected)
}

function removeNewFile(index: number) {
  newFiles.value.splice(index, 1)
}

async function uploadFiles() {
  if (!newFiles.value.length) return
  uploading.value = true
  uploadError.value = ''
  uploadDone.value = null
  try {
    // 1. Ask for one upload slot per file.
    const { uploads } = await $fetch<{ uploads: { path: string; token: string; name: string; type: string }[] }>(
      `/api/client/requests/${id}/attachments`,
      {
        method: 'POST',
        body: { files: newFiles.value.map((f) => ({ name: f.name, size: f.size, type: f.type })) },
      }
    )

    // 2. Upload straight to storage, bypassing the server's size limit.
    const bucket = useSupabaseBrowser().storage.from(ATTACHMENTS_BUCKET)
    await Promise.all(
      uploads.map((u, i) => {
        const file = newFiles.value[i]!
        return bucket.uploadToSignedUrl(u.path, u.token, file, { contentType: file.type })
      })
    )

    // 3. Ask the server to verify and keep them.
    uploadDone.value = await $fetch<{ accepted: number; rejected: number }>(
      `/api/client/requests/${id}/attachments/finalize`,
      { method: 'POST', body: { files: uploads.map((u) => ({ path: u.path, name: u.name, type: u.type })) } }
    )
    newFiles.value = []
    await refresh()
  } catch (err) {
    uploadError.value = t(accountErrorKey(err))
  } finally {
    uploading.value = false
  }
}

const categoryName = computed(() => {
  const c = item.value?.category
  return c ? (locale.value === 'ar' ? c.name_ar : c.name_en) : '—'
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-16">
    <NuxtLink :to="localePath('/account')" class="text-sm text-accent-600 hover:underline">
      ← {{ t('account.requests.back') }}
    </NuxtLink>

    <template v-if="item">
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-heading font-bold">{{ categoryName }}</h1>
        <DashboardStatusBadge :status="item.status" />
      </div>

      <dl class="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg bg-surface border border-divider p-5 text-sm">
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

      <section class="mt-6 rounded-lg bg-surface border border-divider p-5">
        <h2 class="font-heading font-bold mb-2">{{ t('account.requests.details') }}</h2>
        <p class="whitespace-pre-wrap text-neutral-700">{{ item.details }}</p>
      </section>

      <section class="mt-6 rounded-lg bg-surface border border-divider p-5">
        <h2 class="font-heading font-bold mb-3">{{ t('account.requests.attachments') }}</h2>
        <p v-if="!item.attachments.length" class="text-sm text-neutral-500">{{ t('account.requests.noAttachments') }}</p>
        <ul v-else class="divide-y divide-divider">
          <li v-for="a in item.attachments" :key="a.id" class="flex items-center justify-between gap-3 py-2">
            <span class="min-w-0">
              <span class="block truncate text-sm">{{ a.original_filename }}</span>
              <span class="text-xs text-neutral-500">{{ format.bytes(a.size_bytes) }}</span>
            </span>
            <button
              type="button"
              class="shrink-0 px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400"
              :disabled="openingId === a.id"
              @click="openAttachment(a.id)"
            >
              {{ t('account.requests.open') }}
            </button>
          </li>
        </ul>

        <div class="mt-4 border-t border-divider pt-4">
          <p v-if="remainingSlots <= 0" class="text-sm text-neutral-500">
            {{ t('account.attachments.limitReached') }}
          </p>
          <template v-else>
            <label class="inline-block cursor-pointer px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400">
              {{ t('account.attachments.choose') }}
              <input type="file" multiple :accept="acceptTypes" class="sr-only" :disabled="uploading" @change="onFilesSelected">
            </label>
            <p class="mt-2 text-xs text-neutral-500">{{ t('account.attachments.hint') }}</p>

            <ul v-if="newFiles.length" class="mt-3 space-y-1">
              <li
                v-for="(file, i) in newFiles"
                :key="file.name + i"
                class="flex items-center justify-between gap-3 rounded-sm border border-divider px-3 py-1.5 text-sm"
              >
                <span class="truncate">{{ file.name }}</span>
                <button type="button" class="shrink-0 text-red-700 dark:text-red-300 hover:underline" @click="removeNewFile(i)">
                  {{ t('account.attachments.remove') }}
                </button>
              </li>
            </ul>

            <button
              v-if="newFiles.length"
              type="button"
              class="btn-primary mt-3"
              :disabled="uploading"
              @click="uploadFiles"
            >
              {{ uploading ? t('account.attachments.uploading') : t('account.attachments.upload') }}
            </button>
          </template>

          <p v-if="uploadDone?.accepted" class="mt-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {{ t('account.attachments.added', { count: uploadDone.accepted }) }}
          </p>
          <p v-if="uploadDone?.rejected" class="mt-1 text-sm text-amber-700 dark:text-amber-300" role="status">
            {{ t('account.attachments.rejected', { count: uploadDone.rejected }) }}
          </p>
          <p v-if="uploadError" class="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{{ uploadError }}</p>
        </div>
      </section>

      <section class="mt-6 rounded-lg bg-surface border border-divider p-5">
        <h2 class="font-heading font-bold mb-3">{{ t('account.messages.title') }}</h2>

        <p v-if="!item.messages.length" class="text-sm text-neutral-500">{{ t('account.messages.empty') }}</p>
        <ul v-else class="space-y-3 mb-4">
          <li
            v-for="m in item.messages"
            :key="m.id"
            class="rounded-md p-4"
            :class="m.sender === 'client' ? 'bg-accent-100 ms-6' : 'bg-bg border border-divider me-6'"
          >
            <p class="text-xs text-neutral-500 mb-1">
              {{ m.sender === 'client' ? t('account.messages.you') : t('account.messages.team') }} ·
              {{ format.date(m.created_at) }}
            </p>
            <p class="whitespace-pre-wrap text-sm text-neutral-700">{{ m.body }}</p>
          </li>
        </ul>

        <form class="space-y-2" @submit.prevent="sendMessage">
          <label for="msg" class="sr-only">{{ t('account.messages.placeholder') }}</label>
          <textarea
            id="msg"
            v-model="messageBody"
            rows="3"
            maxlength="5000"
            :placeholder="t('account.messages.placeholder')"
            class="field-input"
          />
          <button type="submit" class="btn-primary" :disabled="sending || !messageBody.trim()">
            {{ t('account.messages.send') }}
          </button>
        </form>
        <p v-if="errorKey" class="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
      </section>
    </template>
  </div>
</template>
