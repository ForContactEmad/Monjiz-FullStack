<script setup lang="ts">
import type { Category, PortfolioItem } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, locale } = useI18n()
const { request } = useAdminApi()
useHead({ title: () => t('dashboard.portfolio.title') })

const items = ref<PortfolioItem[]>([])
const categories = ref<Category[]>([])
const errorKey = ref('')

async function load() {
  try {
    ;[items.value, categories.value] = await Promise.all([
      request<PortfolioItem[]>('/api/admin/portfolio'),
      request<Category[]>('/api/admin/categories'),
    ])
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
}
onMounted(load)

// ---- add / edit ----
const emptyForm = () => ({
  category_id: null as string | null,
  image_url: '',
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
  sort_order: 0,
  is_published: true,
})
const form = reactive(emptyForm())
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')
const editor = ref<{ open: () => void; close: () => void } | null>(null)

function openCreate() {
  Object.assign(form, emptyForm())
  editingId.value = null
  formError.value = ''
  editor.value?.open()
}

function openEdit(item: PortfolioItem) {
  Object.assign(form, {
    category_id: item.category_id,
    image_url: item.external_image_url ?? '',
    title_ar: item.title_ar,
    title_en: item.title_en,
    description_ar: item.description_ar ?? '',
    description_en: item.description_en ?? '',
    sort_order: item.sort_order,
    is_published: item.is_published,
  })
  editingId.value = item.id
  formError.value = ''
  editor.value?.open()
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      await request(`/api/admin/portfolio/${editingId.value}`, { method: 'PATCH', body: form })
      editor.value?.close()
    } else {
      // Stay in the dialog after creating, so the image can be added next.
      const created = await request<{ id: string }>('/api/admin/portfolio', { method: 'POST', body: form })
      editingId.value = created.id
    }
    await load()
  } catch (err) {
    formError.value = adminErrorKey(err)
  } finally {
    saving.value = false
  }
}

// ---- image ----
const uploading = ref(false)
const current = computed(() => items.value.find((i) => i.id === editingId.value) ?? null)
const currentImage = computed(() => current.value?.image_url ?? null)

/** Clears the uploaded file so the CDN link (if any) becomes the image shown. */
async function removeUpload() {
  if (!editingId.value) return
  uploading.value = true
  try {
    await request(`/api/admin/portfolio/${editingId.value}/image`, { method: 'DELETE' })
    await load()
  } catch (err) {
    formError.value = adminErrorKey(err)
  } finally {
    uploading.value = false
  }
}

async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !editingId.value) return

  uploading.value = true
  formError.value = ''
  try {
    const blob = await resizeImage(file)
    const body = new FormData()
    body.append('image', blob, blob.type === 'image/webp' ? 'image.webp' : 'image.jpg')
    await request(`/api/admin/portfolio/${editingId.value}/image`, { method: 'POST', body })
    await load()
  } catch (err) {
    formError.value = adminErrorKey(err)
  } finally {
    uploading.value = false
  }
}

// ---- delete ----
const pendingDelete = ref<PortfolioItem | null>(null)
const deleting = ref(false)
const confirmDelete = ref<{ open: () => void; close: () => void } | null>(null)

function askDelete(item: PortfolioItem) {
  pendingDelete.value = item
  confirmDelete.value?.open()
}

async function remove() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await request(`/api/admin/portfolio/${pendingDelete.value.id}`, { method: 'DELETE' })
    await load()
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    confirmDelete.value?.close()
    deleting.value = false
    pendingDelete.value = null
  }
}

const title = (i: PortfolioItem) => (locale.value === 'ar' ? i.title_ar : i.title_en)
const categoryName = (c: Category) => (locale.value === 'ar' ? c.name_ar : c.name_en)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.portfolio.title') }}</h1>
        <p class="text-sm text-neutral-600 mt-1">{{ t('dashboard.portfolio.intro') }}</p>
      </div>
      <button type="button" class="btn-primary" @click="openCreate">{{ t('dashboard.portfolio.add') }}</button>
    </div>

    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
    <p v-if="!items.length && !errorKey" class="mt-8 text-center text-sm text-neutral-500">
      {{ t('dashboard.portfolio.empty') }}
    </p>

    <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="item in items" :key="item.id" class="rounded-lg bg-surface border border-divider overflow-hidden">
        <img v-if="item.image_url" :src="item.image_url" alt="" class="aspect-[16/9] w-full object-cover" loading="lazy">
        <PlaceholderImage v-else alt="" class="aspect-[16/9] w-full" />
        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <p class="font-medium">{{ title(item) }}</p>
            <span
              class="shrink-0 rounded-sm px-2 py-0.5 text-xs"
              :class="item.is_published ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-neutral-200 text-neutral-700'"
            >
              {{ item.is_published ? t('dashboard.common.published') : t('dashboard.common.hidden') }}
            </span>
          </div>
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
        </div>
      </li>
    </ul>

    <DashboardEditDialog
      ref="editor"
      :title="editingId ? t('dashboard.portfolio.editTitle') : t('dashboard.portfolio.addTitle')"
      :busy="saving || uploading"
      :error-key="formError"
      @submit="save"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="p-title-ar" class="field-label">{{ t('dashboard.portfolio.titleAr') }}</label>
          <input id="p-title-ar" v-model="form.title_ar" required maxlength="120" class="field-input" dir="rtl">
        </div>
        <div>
          <label for="p-title-en" class="field-label">{{ t('dashboard.portfolio.titleEn') }}</label>
          <input id="p-title-en" v-model="form.title_en" required maxlength="120" class="field-input" dir="ltr">
        </div>
        <div>
          <label for="p-desc-ar" class="field-label">{{ t('dashboard.portfolio.descAr') }}</label>
          <textarea id="p-desc-ar" v-model="form.description_ar" rows="3" maxlength="500" class="field-input" dir="rtl" />
        </div>
        <div>
          <label for="p-desc-en" class="field-label">{{ t('dashboard.portfolio.descEn') }}</label>
          <textarea id="p-desc-en" v-model="form.description_en" rows="3" maxlength="500" class="field-input" dir="ltr" />
        </div>
        <div>
          <label for="p-category" class="field-label">{{ t('dashboard.portfolio.category') }}</label>
          <select id="p-category" v-model="form.category_id" class="field-input">
            <option :value="null">{{ t('dashboard.portfolio.noCategory') }}</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ categoryName(c) }}</option>
          </select>
        </div>
        <div>
          <label for="p-order" class="field-label">{{ t('dashboard.common.sortOrder') }}</label>
          <input id="p-order" v-model.number="form.sort_order" type="number" min="0" class="field-input">
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.is_published" type="checkbox">
        {{ t('dashboard.portfolio.publishedLabel') }}
      </label>

      <div class="border-t border-divider pt-4">
        <p class="field-label">{{ t('dashboard.portfolio.image') }}</p>
        <p v-if="!editingId" class="text-sm text-neutral-500">{{ t('dashboard.portfolio.saveFirst') }}</p>
        <template v-else>
          <img v-if="currentImage" :src="currentImage" alt="" class="mb-3 aspect-[16/9] w-full rounded-md object-cover">

          <p class="text-sm font-medium mb-1">{{ t('dashboard.portfolioImage.sourceUpload') }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <label class="inline-block cursor-pointer px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400">
              {{ uploading ? t('dashboard.portfolio.uploading') : t('dashboard.portfolio.chooseImage') }}
              <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" :disabled="uploading" @change="onImageSelected">
            </label>
            <button
              v-if="current?.has_upload"
              type="button"
              class="px-3 py-1.5 rounded-sm text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950"
              :disabled="uploading"
              @click="removeUpload"
            >
              {{ t('dashboard.portfolioImage.removeUpload') }}
            </button>
          </div>
          <p class="mt-2 text-xs text-neutral-500">{{ t('dashboard.portfolio.imageHint') }}</p>

          <div class="mt-4">
            <label for="p-image-url" class="field-label">{{ t('dashboard.portfolioImage.urlLabel') }}</label>
            <input
              id="p-image-url"
              v-model.trim="form.image_url"
              type="url"
              pattern="https://.*"
              placeholder="https://cdn.example.com/image.jpg"
              class="field-input"
              dir="ltr"
            >
            <p class="mt-1 text-xs text-neutral-500">{{ t('dashboard.portfolioImage.urlHint') }}</p>
            <p v-if="current?.has_upload" class="mt-1 text-xs text-amber-700 dark:text-amber-300">
              {{ t('dashboard.portfolioImage.uploadWins') }}
            </p>
          </div>
        </template>
      </div>
    </DashboardEditDialog>

    <DashboardConfirmDialog
      ref="confirmDelete"
      :title="t('dashboard.portfolio.deleteTitle')"
      :body="t('dashboard.portfolio.deleteBody')"
      :confirm-label="t('dashboard.common.delete')"
      :busy="deleting"
      @confirm="remove"
    />
  </div>
</template>
