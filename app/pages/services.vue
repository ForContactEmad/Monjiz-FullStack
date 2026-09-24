<script setup lang="ts">
import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachmentType,
} from '#shared/uploads'

const localePath = useLocalePath()
const { t } = useI18n()

useSeoPage({
  titleKey: 'services.seo.title',
  descriptionKey: 'services.seo.description',
})

// Active categories come from the database (editable in the dashboard).
const { categories } = await usePublicSite()
// Accounts are optional. Signed in: name and email come from the account.
// Guest: the form asks for them — see server/api/service-requests.post.ts.
const { profile } = await useClientAccount()

// Limits come from shared/uploads.ts, the same file the server enforces.
// Checking here only gives instant feedback; the server re-verifies every
// file by its real content (server/utils/attachments.ts).
const acceptTypes = Object.keys(ALLOWED_ATTACHMENT_TYPES).join(',')

const form = reactive({
  categorySlug: '',
  details: '',
  fullName: '',
  email: '',
  phone: profile.value?.phone ?? '',
  companyName: profile.value?.company_name ?? '',
  consent: false,
  website: '', // honeypot — hidden from people, see template
})

const files = ref<File[]>([])
const fileError = ref('')

function onFilesSelected(event: Event) {
  fileError.value = ''
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  input.value = '' // allow re-selecting the same file later

  if (files.value.length + selected.length > MAX_ATTACHMENTS) {
    fileError.value = t('services.form.fileCountError')
    return
  }
  for (const f of selected) {
    if (!isAllowedAttachmentType(f.type)) {
      fileError.value = t('services.form.fileTypeError')
      return
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      fileError.value = t('services.form.fileSizeError')
      return
    }
  }
  files.value.push(...selected)
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

const categoryError = ref(false)
const consentError = ref(false)
type Status = 'idle' | 'sending' | 'uploading' | 'success' | 'error'
const status = ref<Status>('idle')
const errorKey = ref('errors.generic')
const rejectedCount = ref(0)

type CreateResponse = {
  ok: true
  requestId: string | null
  finalizeToken: string | null
  uploads: { path: string; token: string }[]
}

async function onSubmit() {
  categoryError.value = !form.categorySlug
  consentError.value = !form.consent
  if (categoryError.value || consentError.value) return

  status.value = 'sending'
  rejectedCount.value = 0
  try {
    // Phase 1: text fields + a description of the files (not the files).
    const created = await $fetch<CreateResponse>('/api/service-requests', {
      method: 'POST',
      body: {
        categorySlug: form.categorySlug,
        details: form.details,
        // Ignored by the server when signed in.
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        companyName: form.companyName,
        consentPrivacy: form.consent,
        website: form.website,
        files: files.value.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      },
    })

    // Phase 2: upload each file straight to storage, then ask the server
    // to verify and finalize them.
    if (created.requestId && created.finalizeToken && created.uploads.length) {
      status.value = 'uploading'
      const bucket = useSupabaseBrowser().storage.from(ATTACHMENTS_BUCKET)
      await Promise.all(
        created.uploads.map((u, i) => {
          const file = files.value[i]!
          // A failed upload is not fatal: finalize counts it as rejected.
          return bucket.uploadToSignedUrl(u.path, u.token, file, { contentType: file.type })
        })
      )
      const result = await $fetch<{ accepted: number; rejected: number }>(
        `/api/service-requests/${created.requestId}/finalize`,
        { method: 'POST', body: { token: created.finalizeToken } }
      )
      rejectedCount.value = result.rejected
    }

    status.value = 'success'
    Object.assign(form, {
      categorySlug: '',
      details: '',
      fullName: '',
      email: '',
      phone: profile.value?.phone ?? '',
      companyName: profile.value?.company_name ?? '',
      consent: false,
      website: '',
    })
    files.value = []
  } catch (err) {
    errorKey.value = apiErrorKey(err)
    status.value = 'error'
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-heading font-semibold text-center">{{ t('services.hero.title') }}</h1>
    <p class="mt-3 text-neutral-600 text-center">{{ t('services.hero.subtitle') }}</p>

    <div v-if="!profile" class="mt-8 rounded-lg bg-accent-100 p-4 text-sm text-accent-800">
      {{ t('services.form.guestNotice') }}
      <NuxtLink :to="localePath('/account/login')" class="underline">{{ t('account.nav.login') }}</NuxtLink>
    </div>

    <form v-else class="mt-10 space-y-6" @submit.prevent="onSubmit">
      <!-- Category -->
      <div>
        <span class="block text-sm font-medium mb-2">{{ t('services.form.categoryLabel') }}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            v-for="category in categories"
            :key="category.slug"
            class="flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
            :class="
              form.categorySlug === category.slug
                ? 'border-accent-500 bg-accent-100'
                : 'border-divider hover:border-accent-300'
            "
          >
            <input
              v-model="form.categorySlug"
              type="radio"
              name="category"
              :value="category.slug"
              class="mt-1"
            >
            <span>
              <span class="block text-sm font-medium">{{ category.title }}</span>
              <span class="block text-xs text-neutral-600">{{ category.description }}</span>
            </span>
          </label>
        </div>
        <p v-if="categoryError" class="mt-1 text-sm text-red-600">
          {{ t('services.form.categoryRequired') }}
        </p>
      </div>

      <!-- Details -->
      <div>
        <label for="details" class="field-label">
          {{ t('services.form.detailsLabel') }}
        </label>
        <textarea
          id="details"
          v-model="form.details"
          required
          rows="5"
          :placeholder="t('services.form.detailsPlaceholder')"
          class="field-input"
        />
      </div>

      <!-- Contact fields: name and email come from the account -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2 rounded-md bg-surface border border-divider px-3 py-2 text-sm text-neutral-600">
          {{ profile?.full_name }} · <span dir="ltr">{{ profile?.email }}</span>
        </div>
        <template v-if="!profile">
          <div>
            <label for="fullName" class="field-label">{{ t('services.form.fullNameLabel') }}</label>
            <input
              id="fullName"
              v-model="form.fullName"
              type="text"
              required
              :placeholder="t('services.form.fullNamePlaceholder')"
              class="field-input"
            >
          </div>
          <div>
            <label for="email" class="field-label">{{ t('services.form.emailLabel') }}</label>
            <input id="email" v-model="form.email" type="email" required class="field-input" dir="ltr">
          </div>
        </template>

        <div>
          <label for="phone" class="field-label">
            {{ t('services.form.phoneLabel') }}
          </label>
          <input id="phone" v-model="form.phone" type="tel" class="field-input">
        </div>
        <div>
          <label for="companyName" class="field-label">
            {{ t('services.form.companyLabel') }}
          </label>
          <input id="companyName" v-model="form.companyName" type="text" class="field-input">
        </div>
      </div>

      <!-- Attachments -->
      <div>
        <label for="attachments" class="field-label">
          {{ t('services.form.attachmentsLabel') }}
        </label>
        <input
          id="attachments"
          type="file"
          multiple
          :accept="acceptTypes"
          class="w-full text-sm"
          @change="onFilesSelected"
        >
        <p class="mt-1 text-xs text-neutral-600">{{ t('services.form.attachmentsHint') }}</p>
        <p v-if="fileError" class="mt-1 text-sm text-red-600">{{ fileError }}</p>

        <ul v-if="files.length" class="mt-2 space-y-1">
          <li
            v-for="(file, i) in files"
            :key="file.name + i"
            class="flex items-center justify-between text-sm rounded-md border border-divider px-3 py-1.5"
          >
            <span class="truncate">{{ file.name }}</span>
            <button
              type="button"
              class="text-red-600 hover:underline shrink-0 ms-3"
              @click="removeFile(i)"
            >
              {{ t('services.form.removeFile') }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Honeypot: invisible to people and screen readers; bots fill it. -->
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <label for="website">Website</label>
        <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" >
      </div>

      <!-- Consent -->
      <div>
        <label class="flex items-start gap-2 text-sm">
          <input v-model="form.consent" type="checkbox" class="mt-0.5" >
          <span>
            {{ t('forms.consentPrefix') }}
            <NuxtLink :to="localePath('/privacy')" target="_blank" class="text-accent-600 hover:underline">
              {{ t('footer.privacy') }}
            </NuxtLink>
          </span>
        </label>
        <p v-if="consentError" class="mt-1 text-sm text-red-600">
          {{ t('services.form.consentRequired') }}
        </p>
      </div>

      <button
        type="submit"
        :disabled="status === 'sending' || status === 'uploading'"
        class="btn-primary w-full"
      >
        {{
          status === 'sending'
            ? t('services.form.sending')
            : status === 'uploading'
              ? t('services.form.uploading')
              : t('services.form.submit')
        }}
      </button>

      <p v-if="status === 'success'" class="text-sm text-center text-green-700" role="status">
        {{ t('services.form.success') }}
      </p>
      <p v-if="status === 'success' && rejectedCount" class="text-sm text-center text-amber-700" role="status">
        {{ t('services.form.someFilesRejected', { count: rejectedCount }) }}
      </p>
      <p v-if="status === 'error'" class="text-sm text-center text-red-600" role="alert">
        {{ t(errorKey) }}
      </p>
    </form>
  </div>
</template>
