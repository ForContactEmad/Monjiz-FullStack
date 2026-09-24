<script setup lang="ts">
import type { Category } from '#shared/types/admin'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const { t, locale } = useI18n()
const { request } = useAdminApi()
useHead({ title: () => t('dashboard.services.title') })

const categories = ref<Category[]>([])
const errorKey = ref('')

async function load() {
  try {
    categories.value = await request<Category[]>('/api/admin/categories')
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  }
}
onMounted(load)

const emptyForm = () => ({
  slug: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  sort_order: 0,
  is_active: true,
})
const form = reactive(emptyForm())
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')
const editor = ref<{ open: () => void; close: () => void } | null>(null)

function openCreate() {
  Object.assign(form, emptyForm(), { sort_order: (categories.value.at(-1)?.sort_order ?? 0) + 1 })
  editingId.value = null
  formError.value = ''
  editor.value?.open()
}

function openEdit(c: Category) {
  Object.assign(form, {
    slug: c.slug,
    name_ar: c.name_ar,
    name_en: c.name_en,
    description_ar: c.description_ar ?? '',
    description_en: c.description_en ?? '',
    sort_order: c.sort_order,
    is_active: c.is_active,
  })
  editingId.value = c.id
  formError.value = ''
  editor.value?.open()
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editingId.value) {
      // The slug is fixed after creation, so it isn't sent on update.
      const { slug: _slug, ...changes } = form
      await request(`/api/admin/categories/${editingId.value}`, { method: 'PATCH', body: changes })
    } else {
      await request('/api/admin/categories', { method: 'POST', body: form })
    }
    editor.value?.close()
    await load()
  } catch (err) {
    formError.value = adminErrorKey(err)
  } finally {
    saving.value = false
  }
}

const name = (c: Category) => (locale.value === 'ar' ? c.name_ar : c.name_en)
const description = (c: Category) => (locale.value === 'ar' ? c.description_ar : c.description_en) ?? ''
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="max-w-2xl">
        <h1 class="text-2xl font-heading font-bold">{{ t('dashboard.services.title') }}</h1>
        <p class="text-sm text-neutral-600 mt-1">{{ t('dashboard.services.intro') }}</p>
      </div>
      <button type="button" class="btn-primary" @click="openCreate">{{ t('dashboard.services.add') }}</button>
    </div>

    <p v-if="errorKey" class="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>

    <ul class="mt-6 divide-y divide-divider rounded-lg bg-surface border border-divider">
      <li v-for="c in categories" :key="c.id" class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="min-w-0">
          <p class="font-medium">
            {{ name(c) }}
            <span class="ms-2 text-xs text-neutral-500" dir="ltr">{{ c.slug }}</span>
          </p>
          <p class="text-sm text-neutral-600">{{ description(c) }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="rounded-sm px-2 py-0.5 text-xs"
            :class="c.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-neutral-200 text-neutral-700'"
          >
            {{ c.is_active ? t('dashboard.common.published') : t('dashboard.common.hidden') }}
          </span>
          <button type="button" class="px-3 py-1.5 rounded-sm border border-divider text-sm hover:border-accent-400" @click="openEdit(c)">
            {{ t('dashboard.common.edit') }}
          </button>
        </div>
      </li>
    </ul>

    <DashboardEditDialog
      ref="editor"
      :title="editingId ? t('dashboard.services.editTitle') : t('dashboard.services.addTitle')"
      :busy="saving"
      :error-key="formError"
      @submit="save"
    >
      <div>
        <label for="c-slug" class="field-label">{{ t('dashboard.services.slug') }}</label>
        <input
          id="c-slug"
          v-model="form.slug"
          required
          pattern="[a-z][a-z0-9\-]{1,39}"
          :disabled="Boolean(editingId)"
          class="field-input disabled:opacity-60"
          dir="ltr"
        >
        <p class="mt-1 text-xs text-neutral-500">{{ t('dashboard.services.slugHint') }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="c-name-ar" class="field-label">{{ t('dashboard.services.nameAr') }}</label>
          <input id="c-name-ar" v-model="form.name_ar" required maxlength="80" class="field-input" dir="rtl">
        </div>
        <div>
          <label for="c-name-en" class="field-label">{{ t('dashboard.services.nameEn') }}</label>
          <input id="c-name-en" v-model="form.name_en" required maxlength="80" class="field-input" dir="ltr">
        </div>
        <div>
          <label for="c-desc-ar" class="field-label">{{ t('dashboard.services.descAr') }}</label>
          <textarea id="c-desc-ar" v-model="form.description_ar" rows="2" maxlength="200" class="field-input" dir="rtl" />
        </div>
        <div>
          <label for="c-desc-en" class="field-label">{{ t('dashboard.services.descEn') }}</label>
          <textarea id="c-desc-en" v-model="form.description_en" rows="2" maxlength="200" class="field-input" dir="ltr" />
        </div>
        <div>
          <label for="c-order" class="field-label">{{ t('dashboard.common.sortOrder') }}</label>
          <input id="c-order" v-model.number="form.sort_order" type="number" min="0" class="field-input">
          <p class="mt-1 text-xs text-neutral-500">{{ t('dashboard.common.sortOrderHint') }}</p>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.is_active" type="checkbox">
        {{ t('dashboard.services.activeLabel') }}
      </label>
    </DashboardEditDialog>
  </div>
</template>
