<script setup lang="ts">
import type { SiteSettings, Testimonial } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t } = useI18n()
const { request } = useAdminApi()
useHead({ title: () => t('dashboard.settings.title') })

// ------------------------------------------------------------------
// Site settings — number inputs use '' for "empty" so a cleared field
// is sent as null and the section disappears from the site.
// ------------------------------------------------------------------
const settings = reactive({
  orders_completed: '' as number | '',
  years_experience: '' as number | '',
  freelance_license_number: '',
  contact_email: '',
  whatsapp: '',
})
const savingSettings = ref(false)
const settingsSaved = ref(false)
const settingsError = ref('')

const toNullableNumber = (v: number | '') => (v === '' ? null : v)

async function loadSettings() {
  const s = await request<SiteSettings>('/api/admin/settings')
  Object.assign(settings, {
    orders_completed: s.orders_completed ?? '',
    years_experience: s.years_experience ?? '',
    freelance_license_number: s.freelance_license_number ?? '',
    contact_email: s.contact_email ?? '',
    whatsapp: s.whatsapp ?? '',
  })
}

async function saveSettings() {
  savingSettings.value = true
  settingsSaved.value = false
  settingsError.value = ''
  try {
    await request('/api/admin/settings', {
      method: 'PUT',
      body: {
        ...settings,
        orders_completed: toNullableNumber(settings.orders_completed),
        years_experience: toNullableNumber(settings.years_experience),
      },
    })
    settingsSaved.value = true
  } catch (err) {
    settingsError.value = adminErrorKey(err)
  } finally {
    savingSettings.value = false
  }
}

// ------------------------------------------------------------------
// Testimonials
// ------------------------------------------------------------------
const testimonials = ref<Testimonial[]>([])
const emptyReview = () => ({ name: '', text: '', sort_order: 0, is_published: true })
const review = reactive(emptyReview())
const editingId = ref<string | null>(null)
const savingReview = ref(false)
const reviewError = ref('')
const editor = ref<{ open: () => void; close: () => void } | null>(null)

async function loadTestimonials() {
  testimonials.value = await request<Testimonial[]>('/api/admin/testimonials')
}

function openCreate() {
  Object.assign(review, emptyReview(), { sort_order: testimonials.value.length })
  editingId.value = null
  reviewError.value = ''
  editor.value?.open()
}

function openEdit(item: Testimonial) {
  Object.assign(review, { name: item.name, text: item.text, sort_order: item.sort_order, is_published: item.is_published })
  editingId.value = item.id
  reviewError.value = ''
  editor.value?.open()
}

async function saveReview() {
  savingReview.value = true
  reviewError.value = ''
  try {
    if (editingId.value) {
      await request(`/api/admin/testimonials/${editingId.value}`, { method: 'PATCH', body: review })
    } else {
      await request('/api/admin/testimonials', { method: 'POST', body: review })
    }
    editor.value?.close()
    await loadTestimonials()
  } catch (err) {
    reviewError.value = adminErrorKey(err)
  } finally {
    savingReview.value = false
  }
}

const pendingDelete = ref<Testimonial | null>(null)
const deleting = ref(false)
const confirmDelete = ref<{ open: () => void; close: () => void } | null>(null)

function askDelete(item: Testimonial) {
  pendingDelete.value = item
  confirmDelete.value?.open()
}

async function removeReview() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await request(`/api/admin/testimonials/${pendingDelete.value.id}`, { method: 'DELETE' })
    await loadTestimonials()
  } catch (err) {
    reviewError.value = adminErrorKey(err)
  } finally {
    confirmDelete.value?.close()
    deleting.value = false
    pendingDelete.value = null
  }
}

const loadError = ref('')
onMounted(async () => {
  try {
    await Promise.all([loadSettings(), loadTestimonials()])
  } catch (err) {
    loadError.value = adminErrorKey(err)
  }
})
</script>

<template>
  <div class="space-y-10">
    <div>
      <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.settings.title') }}</h1>
      <p class="text-sm text-neutral-600 mt-1">{{ t('dashboard.settings.intro') }}</p>
      <p v-if="loadError" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(loadError) }}</p>
    </div>

    <form class="rounded-lg bg-surface border border-divider p-6 space-y-6" @submit.prevent="saveSettings">
      <fieldset>
        <legend class="font-heading font-bold mb-3">{{ t('dashboard.settings.stats') }}</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="s-orders" class="field-label">{{ t('dashboard.settings.ordersCompleted') }}</label>
            <input id="s-orders" v-model.number="settings.orders_completed" type="number" min="0" class="field-input">
          </div>
          <div>
            <label for="s-years" class="field-label">{{ t('dashboard.settings.yearsExperience') }}</label>
            <input id="s-years" v-model.number="settings.years_experience" type="number" min="0" max="80" class="field-input">
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend class="font-heading font-bold mb-3">{{ t('dashboard.settings.contact') }}</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="s-email" class="field-label">{{ t('dashboard.settings.email') }}</label>
            <input id="s-email" v-model.trim="settings.contact_email" type="email" class="field-input" dir="ltr">
          </div>
          <div>
            <label for="s-whatsapp" class="field-label">{{ t('dashboard.settings.whatsapp') }}</label>
            <input
              id="s-whatsapp"
              v-model.trim="settings.whatsapp"
              inputmode="numeric"
              pattern="[0-9]{8,15}"
              class="field-input"
              dir="ltr"
            >
            <p class="mt-1 text-xs text-neutral-500">{{ t('dashboard.settings.whatsappHint') }}</p>
          </div>
          <div>
            <label for="s-license" class="field-label">{{ t('dashboard.settings.license') }}</label>
            <input id="s-license" v-model.trim="settings.freelance_license_number" maxlength="50" class="field-input" dir="ltr">
          </div>
        </div>
      </fieldset>

      <div class="flex items-center gap-3">
        <button type="submit" class="btn-primary" :disabled="savingSettings">{{ t('dashboard.common.save') }}</button>
        <p v-if="settingsSaved" class="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {{ t('dashboard.common.saved') }}
        </p>
        <p v-if="settingsError" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ t(settingsError) }}</p>
      </div>
    </form>

    <section>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="max-w-2xl">
          <h2 class="text-xl font-heading font-bold">{{ t('dashboard.testimonials.title') }}</h2>
          <p class="text-sm text-neutral-600 mt-1">{{ t('dashboard.testimonials.intro') }}</p>
        </div>
        <button type="button" class="btn-primary" @click="openCreate">{{ t('dashboard.testimonials.add') }}</button>
      </div>

      <p v-if="!testimonials.length" class="mt-6 text-sm text-neutral-500">{{ t('dashboard.testimonials.empty') }}</p>
      <ul class="mt-6 space-y-3">
        <li v-for="item in testimonials" :key="item.id" class="rounded-lg bg-surface border border-divider p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-medium">{{ item.name }}</p>
            <span
              class="rounded-sm px-2 py-0.5 text-xs"
              :class="item.is_published ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-neutral-200 text-neutral-700'"
            >
              {{ item.is_published ? t('dashboard.common.published') : t('dashboard.common.hidden') }}
            </span>
          </div>
          <p class="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{{ item.text }}</p>
          <div class="mt-3 flex gap-2 text-sm">
            <button type="button" class="px-3 py-1.5 rounded-sm border border-divider hover:border-accent-400" @click="openEdit(item)">
              {{ t('dashboard.common.edit') }}
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
              @click="askDelete(item)"
            >
              {{ t('dashboard.common.delete') }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <DashboardEditDialog
      ref="editor"
      :title="editingId ? t('dashboard.testimonials.editTitle') : t('dashboard.testimonials.addTitle')"
      :busy="savingReview"
      :error-key="reviewError"
      @submit="saveReview"
    >
      <div>
        <label for="r-name" class="field-label">{{ t('dashboard.testimonials.name') }}</label>
        <input id="r-name" v-model="review.name" required maxlength="100" class="field-input" dir="auto">
      </div>
      <div>
        <label for="r-text" class="field-label">{{ t('dashboard.testimonials.text') }}</label>
        <textarea id="r-text" v-model="review.text" required rows="4" maxlength="1000" class="field-input" dir="auto" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2 items-end">
        <div>
          <label for="r-order" class="field-label">{{ t('dashboard.common.sortOrder') }}</label>
          <input id="r-order" v-model.number="review.sort_order" type="number" min="0" class="field-input">
        </div>
        <label class="flex items-center gap-2 text-sm pb-2">
          <input v-model="review.is_published" type="checkbox">
          {{ t('dashboard.testimonials.publishedLabel') }}
        </label>
      </div>
    </DashboardEditDialog>

    <DashboardConfirmDialog
      ref="confirmDelete"
      :title="t('dashboard.testimonials.deleteTitle')"
      :body="t('dashboard.testimonials.deleteBody')"
      :confirm-label="t('dashboard.common.delete')"
      :busy="deleting"
      @confirm="removeReview"
    />
  </div>
</template>
