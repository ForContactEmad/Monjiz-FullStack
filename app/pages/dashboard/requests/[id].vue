<script setup lang="ts">
import { REQUEST_STATUSES, type RequestDetail, type RequestNote, type RequestStatus } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { request } = useAdminApi()
const format = useFormat()
useHead({ title: () => t('dashboard.request.details') })

const id = route.params.id as string
const item = ref<RequestDetail | null>(null)
const errorKey = ref('')
const status = ref<RequestStatus>('new')
const savingStatus = ref(false)
const savedStatus = ref(false)
const openingId = ref<string | null>(null)
const deleting = ref(false)
const confirmDelete = ref<{ open: () => void; close: () => void } | null>(null)

// Price / due date / notes. '' means "not set" and is sent as null.
const manage = reactive({ quoted_price: '' as number | '', due_date: '' })
const savingManage = ref(false)
const savedManage = ref(false)

async function load() {
  try {
    item.value = await request<RequestDetail>(`/api/admin/requests/${id}`)
    status.value = item.value.status
    Object.assign(manage, {
      quoted_price: item.value.quoted_price ?? '',
      due_date: item.value.due_date ?? '',
    })
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
}
onMounted(load)

async function saveStatus() {
  savingStatus.value = true
  savedStatus.value = false
  try {
    await request(`/api/admin/requests/${id}`, { method: 'PATCH', body: { status: status.value } })
    savedStatus.value = true
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    savingStatus.value = false
  }
}

async function saveManage() {
  savingManage.value = true
  savedManage.value = false
  try {
    await request(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      body: {
        quoted_price: manage.quoted_price === '' ? null : manage.quoted_price,
        due_date: manage.due_date || null,
      },
    })
    savedManage.value = true
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    savingManage.value = false
  }
}

/** Fetches a 60-second signed link and opens it; nothing is cached. */
async function openAttachment(attachmentId: string) {
  openingId.value = attachmentId
  // Open the tab synchronously (inside the click) so popup blockers allow
  // it, then point it at the signed URL once we have it.
  const tab = window.open('about:blank', '_blank')
  try {
    const { url } = await request<{ url: string }>(`/api/admin/attachments/${attachmentId}/url`, { method: 'POST' })
    if (tab) {
      tab.opener = null
      tab.location.href = url
    }
  } catch (err) {
    tab?.close()
    errorKey.value = adminErrorKey(err)
  } finally {
    openingId.value = null
  }
}

async function deleteRequest() {
  deleting.value = true
  try {
    await request(`/api/admin/requests/${id}`, { method: 'DELETE' })
    confirmDelete.value?.close()
    await navigateTo(localePath('/dashboard/requests'))
  } catch (err) {
    confirmDelete.value?.close()
    errorKey.value = adminErrorKey(err)
  } finally {
    deleting.value = false
  }
}

// ------------------------------------------------- messages to the client
const replyBody = ref('')
const sendingReply = ref(false)

async function sendReply() {
  const body = replyBody.value.trim()
  if (!body) return
  sendingReply.value = true
  try {
    await request(`/api/admin/requests/${id}/messages`, { method: 'POST', body: { body } })
    replyBody.value = ''
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    sendingReply.value = false
  }
}

// ---------------------------------------------------------------- notes
const newNote = ref('')
const savingNote = ref(false)
const editingNoteId = ref<string | null>(null)
const editingNoteBody = ref('')

async function addNote() {
  const body = newNote.value.trim()
  if (!body) return
  savingNote.value = true
  try {
    await request(`/api/admin/requests/${id}/notes`, { method: 'POST', body: { body } })
    newNote.value = ''
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    savingNote.value = false
  }
}

function startEditNote(note: RequestNote) {
  editingNoteId.value = note.id
  editingNoteBody.value = note.body
}

async function saveNote() {
  const body = editingNoteBody.value.trim()
  if (!editingNoteId.value || !body) return
  savingNote.value = true
  try {
    await request(`/api/admin/request-notes/${editingNoteId.value}`, { method: 'PATCH', body: { body } })
    editingNoteId.value = null
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    savingNote.value = false
  }
}

const pendingNoteDelete = ref<RequestNote | null>(null)
const confirmNoteDelete = ref<{ open: () => void; close: () => void } | null>(null)

function askDeleteNote(note: RequestNote) {
  pendingNoteDelete.value = note
  confirmNoteDelete.value?.open()
}

async function deleteNote() {
  if (!pendingNoteDelete.value) return
  try {
    await request(`/api/admin/request-notes/${pendingNoteDelete.value.id}`, { method: 'DELETE' })
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    confirmNoteDelete.value?.close()
    pendingNoteDelete.value = null
  }
}

// ------------------------------------------- editing what the client sent
const clientForm = reactive({ full_name: '', email: '', phone: '', company_name: '', details: '' })
const savingClient = ref(false)
const clientError = ref('')
const clientEditor = ref<{ open: () => void; close: () => void } | null>(null)

function openClientEditor() {
  if (!item.value) return
  Object.assign(clientForm, {
    full_name: item.value.full_name,
    email: item.value.email,
    phone: item.value.phone ?? '',
    company_name: item.value.company_name ?? '',
    details: item.value.details,
  })
  clientError.value = ''
  clientEditor.value?.open()
}

async function saveClientFields() {
  savingClient.value = true
  clientError.value = ''
  try {
    await request(`/api/admin/requests/${id}`, { method: 'PATCH', body: { ...clientForm } })
    clientEditor.value?.close()
    await load()
  } catch (err) {
    clientError.value = adminErrorKey(err)
  } finally {
    savingClient.value = false
  }
}

function auditLabel(action: string) {
  if (action.startsWith('set_status:')) {
    const s = action.split(':')[1]
    return t('dashboard.audit.set_status', { status: t(`dashboard.status.${s}`) })
  }
  return t(`dashboard.audit.${action}`)
}

const categoryName = computed(() => {
  const c = item.value?.category
  return c ? (locale.value === 'ar' ? c.name_ar : c.name_en) : '—'
})
</script>

<template>
  <div>
    <NuxtLink :to="localePath('/dashboard/requests')" class="text-sm text-accent-600 hover:underline">
      ← {{ t('dashboard.request.back') }}
    </NuxtLink>
    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>

    <template v-if="item">
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-heading font-bold">{{ item.full_name }}</h1>
        <DashboardStatusBadge :status="item.status" />
      </div>
      <p class="text-sm text-neutral-500 mt-1">
        {{ categoryName }} · {{ t('dashboard.request.createdAt') }}: {{ format.date(item.created_at) }}
      </p>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <section class="rounded-lg bg-surface border border-divider p-5">
            <div class="flex items-start justify-between gap-3 mb-2">
              <h2 class="font-heading font-bold">{{ t('dashboard.request.details') }}</h2>
              <button
                type="button"
                class="shrink-0 px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400"
                @click="openClientEditor"
              >
                {{ t('dashboard.editClient.open') }}
              </button>
            </div>
            <!-- Plain text interpolation: client text is never rendered as HTML. -->
            <p class="whitespace-pre-wrap text-neutral-700">{{ item.details }}</p>
          </section>

          <section class="rounded-lg bg-surface border border-divider p-5">
            <h2 class="font-heading font-bold mb-3">{{ t('dashboard.messagesThread.title') }}</h2>
            <p class="text-xs text-neutral-500 mb-3">{{ t('dashboard.messagesThread.hint') }}</p>

            <p v-if="!item.messages.length" class="text-sm text-neutral-500">{{ t('dashboard.messagesThread.empty') }}</p>
            <ul v-else class="space-y-3 mb-4">
              <li
                v-for="m in item.messages"
                :key="m.id"
                class="rounded-md p-4"
                :class="m.sender === 'admin' ? 'bg-accent-100 ms-6' : 'bg-bg border border-divider me-6'"
              >
                <p class="text-xs text-neutral-500 mb-1">
                  {{ m.sender === 'admin' ? t('dashboard.messagesThread.you') : t('dashboard.messagesThread.client') }} ·
                  {{ format.date(m.created_at) }}
                </p>
                <p class="whitespace-pre-wrap text-sm text-neutral-700">{{ m.body }}</p>
              </li>
            </ul>

            <form class="space-y-2" @submit.prevent="sendReply">
              <label for="reply" class="sr-only">{{ t('dashboard.messagesThread.placeholder') }}</label>
              <textarea
                id="reply"
                v-model="replyBody"
                rows="3"
                maxlength="5000"
                :placeholder="t('dashboard.messagesThread.placeholder')"
                class="field-input"
              />
              <button type="submit" class="btn-primary" :disabled="sendingReply || !replyBody.trim()">
                {{ t('dashboard.messagesThread.send') }}
              </button>
            </form>
          </section>

          <section class="rounded-lg bg-surface border border-divider p-5">
            <h2 class="font-heading font-bold mb-3">{{ t('dashboard.notes.title') }}</h2>

            <form class="space-y-2" @submit.prevent="addNote">
              <label for="new-note" class="sr-only">{{ t('dashboard.notes.placeholder') }}</label>
              <textarea
                id="new-note"
                v-model="newNote"
                rows="3"
                maxlength="5000"
                :placeholder="t('dashboard.notes.placeholder')"
                class="field-input"
              />
              <button type="submit" class="btn-primary" :disabled="savingNote || !newNote.trim()">
                {{ t('dashboard.notes.add') }}
              </button>
            </form>

            <p v-if="!item.notes.length" class="mt-4 text-sm text-neutral-500">{{ t('dashboard.notes.empty') }}</p>
            <ul v-else class="mt-4 space-y-3">
              <li v-for="note in item.notes" :key="note.id" class="rounded-md bg-bg border border-divider p-4">
                <template v-if="editingNoteId === note.id">
                  <textarea v-model="editingNoteBody" rows="3" maxlength="5000" class="field-input" />
                  <div class="mt-2 flex gap-2 text-sm">
                    <button type="button" class="btn-primary" :disabled="savingNote" @click="saveNote">
                      {{ t('dashboard.common.save') }}
                    </button>
                    <button type="button" class="px-3 py-1.5 rounded-sm border border-divider" @click="editingNoteId = null">
                      {{ t('dashboard.cancel') }}
                    </button>
                  </div>
                </template>
                <template v-else>
                  <p class="whitespace-pre-wrap text-sm text-neutral-700">{{ note.body }}</p>
                  <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                    <span>{{ format.date(note.created_at) }}</span>
                    <span v-if="note.updated_at !== note.created_at">({{ t('dashboard.notes.edited') }})</span>
                    <button type="button" class="hover:text-accent-600" @click="startEditNote(note)">
                      {{ t('dashboard.common.edit') }}
                    </button>
                    <button type="button" class="text-red-700 dark:text-red-300 hover:underline" @click="askDeleteNote(note)">
                      {{ t('dashboard.common.delete') }}
                    </button>
                  </div>
                </template>
              </li>
            </ul>
          </section>

          <section class="rounded-lg bg-surface border border-divider p-5">
            <h2 class="font-heading font-bold mb-3">{{ t('dashboard.request.attachments') }}</h2>
            <p v-if="!item.attachments.length" class="text-sm text-neutral-500">{{ t('dashboard.request.noAttachments') }}</p>
            <ul v-else class="divide-y divide-divider">
              <li v-for="a in item.attachments" :key="a.id" class="flex items-center justify-between gap-3 py-2">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium" dir="auto">{{ a.original_filename }}</span>
                  <span class="text-xs text-neutral-500">{{ format.bytes(a.size_bytes) }}</span>
                </span>
                <button
                  type="button"
                  class="shrink-0 px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400 disabled:opacity-60"
                  :disabled="openingId === a.id"
                  @click="openAttachment(a.id)"
                >
                  {{ openingId === a.id ? t('dashboard.request.opening') : t('dashboard.request.open') }}
                </button>
              </li>
            </ul>
            <p v-if="item.attachments.length" class="mt-3 text-xs text-neutral-500">{{ t('dashboard.request.linkNote') }}</p>
          </section>
        </div>

        <div class="space-y-6">
          <section class="rounded-lg bg-surface border border-divider p-5">
            <h2 class="font-heading font-bold mb-3">{{ t('dashboard.request.contact') }}</h2>
            <dl class="space-y-2 text-sm">
              <div>
                <dt class="text-neutral-500">{{ t('dashboard.request.email') }}</dt>
                <dd dir="ltr" class="text-start"><a :href="`mailto:${item.email}`" class="text-accent-700 hover:underline">{{ item.email }}</a></dd>
              </div>
              <div>
                <dt class="text-neutral-500">{{ t('dashboard.request.phone') }}</dt>
                <dd dir="ltr" class="text-start">{{ item.phone ?? t('dashboard.request.noValue') }}</dd>
              </div>
              <div>
                <dt class="text-neutral-500">{{ t('dashboard.request.company') }}</dt>
                <dd>{{ item.company_name ?? t('dashboard.request.noValue') }}</dd>
              </div>
            </dl>
          </section>

          <form class="rounded-lg bg-surface border border-divider p-5 space-y-3" @submit.prevent="saveManage">
            <h2 class="font-heading font-bold">{{ t('dashboard.manage.title') }}</h2>
            <div>
              <label for="m-price" class="field-label">{{ t('dashboard.manage.price') }}</label>
              <input id="m-price" v-model.number="manage.quoted_price" type="number" min="0" step="0.01" class="field-input" dir="ltr">
            </div>
            <div>
              <label for="m-due" class="field-label">{{ t('dashboard.manage.dueDate') }}</label>
              <input id="m-due" v-model="manage.due_date" type="date" class="field-input" dir="ltr">
            </div>
            <button type="submit" class="btn-primary w-full" :disabled="savingManage">{{ t('dashboard.manage.save') }}</button>
            <p v-if="savedManage" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {{ t('dashboard.common.saved') }}
            </p>
          </form>

          <section class="rounded-lg bg-surface border border-divider p-5">
            <label for="status" class="font-heading font-bold block mb-2">{{ t('dashboard.request.statusLabel') }}</label>
            <select id="status" v-model="status" class="field-input">
              <option v-for="s in REQUEST_STATUSES" :key="s" :value="s">{{ t(`dashboard.status.${s}`) }}</option>
            </select>
            <button
              type="button"
              class="btn-primary w-full mt-3"
              :disabled="savingStatus || status === item.status"
              @click="saveStatus"
            >
              {{ t('dashboard.request.save') }}
            </button>
            <p v-if="savedStatus" class="mt-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {{ t('dashboard.request.saved') }}
            </p>
          </section>

          <section class="rounded-lg bg-surface border border-divider p-5">
            <h2 class="font-heading font-bold mb-3">{{ t('dashboard.request.audit') }}</h2>
            <p v-if="!item.audit.length" class="text-sm text-neutral-500">{{ t('dashboard.request.noAudit') }}</p>
            <ul v-else class="space-y-2 text-sm max-h-64 overflow-y-auto">
              <li v-for="entry in item.audit" :key="entry.id" class="flex justify-between gap-3">
                <span>{{ auditLabel(entry.action) }}</span>
                <span class="text-xs text-neutral-500 whitespace-nowrap">{{ format.date(entry.created_at) }}</span>
              </li>
            </ul>
          </section>

          <button
            type="button"
            class="w-full px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
            @click="confirmDelete?.open()"
          >
            {{ t('dashboard.request.delete') }}
          </button>
        </div>
      </div>

      <DashboardEditDialog
        ref="clientEditor"
        :title="t('dashboard.editClient.title')"
        :busy="savingClient"
        :error-key="clientError"
        @submit="saveClientFields"
      >
        <p class="text-sm text-neutral-600">{{ t('dashboard.editClient.hint') }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="cf-name" class="field-label">{{ t('dashboard.editClient.name') }}</label>
            <input id="cf-name" v-model="clientForm.full_name" required maxlength="100" class="field-input">
          </div>
          <div>
            <label for="cf-email" class="field-label">{{ t('dashboard.editClient.email') }}</label>
            <input id="cf-email" v-model="clientForm.email" type="email" required class="field-input" dir="ltr">
          </div>
          <div>
            <label for="cf-phone" class="field-label">{{ t('dashboard.editClient.phone') }}</label>
            <input id="cf-phone" v-model="clientForm.phone" type="tel" class="field-input" dir="ltr">
          </div>
          <div>
            <label for="cf-company" class="field-label">{{ t('dashboard.editClient.company') }}</label>
            <input id="cf-company" v-model="clientForm.company_name" maxlength="150" class="field-input">
          </div>
        </div>
        <div>
          <label for="cf-details" class="field-label">{{ t('dashboard.editClient.details') }}</label>
          <textarea id="cf-details" v-model="clientForm.details" required rows="5" maxlength="5000" class="field-input" />
        </div>
      </DashboardEditDialog>

      <DashboardConfirmDialog
        ref="confirmNoteDelete"
        :title="t('dashboard.notes.deleteTitle')"
        :body="t('dashboard.notes.deleteBody')"
        :confirm-label="t('dashboard.common.delete')"
        @confirm="deleteNote"
      />

      <DashboardConfirmDialog
        ref="confirmDelete"
        :title="t('dashboard.request.deleteTitle')"
        :body="t('dashboard.request.deleteBody')"
        :confirm-label="t('dashboard.request.deleteConfirm')"
        :busy="deleting"
        @confirm="deleteRequest"
      />
    </template>
  </div>
</template>
