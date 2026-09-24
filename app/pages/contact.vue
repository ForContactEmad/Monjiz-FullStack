<script setup lang="ts">
const localePath = useLocalePath()
const { t } = useI18n()

useSeoPage({
  titleKey: 'contact.seo.title',
  descriptionKey: 'contact.seo.description',
})

const form = reactive({
  fullName: '',
  email: '',
  message: '',
  consent: false,
  website: '', // honeypot — hidden from people, see template
})

type Status = 'idle' | 'sending' | 'success' | 'error'
const status = ref<Status>('idle')
const errorKey = ref('errors.generic')
const consentError = ref(false)

async function onSubmit() {
  consentError.value = !form.consent
  if (consentError.value) return

  status.value = 'sending'
  try {
    await $fetch('/api/contact-messages', {
      method: 'POST',
      body: {
        fullName: form.fullName,
        email: form.email,
        message: form.message,
        consentPrivacy: form.consent,
        website: form.website,
      },
    })
    status.value = 'success'
    form.fullName = ''
    form.email = ''
    form.message = ''
    form.consent = false
  } catch (err) {
    errorKey.value = apiErrorKey(err)
    status.value = 'error'
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-heading font-semibold text-center">{{ t('contact.hero.title') }}</h1>
    <p class="mt-3 text-neutral-600 text-center">{{ t('contact.hero.subtitle') }}</p>

    <form class="mt-10 space-y-5" @submit.prevent="onSubmit">
      <div>
        <label for="fullName" class="field-label">{{ t('contact.form.name') }}</label>
        <input
          id="fullName"
          v-model="form.fullName"
          type="text"
          required
          :placeholder="t('contact.form.namePlaceholder')"
          class="field-input"
        >
      </div>

      <div>
        <label for="email" class="field-label">{{ t('contact.form.email') }}</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          class="field-input"
        >
      </div>

      <div>
        <label for="message" class="field-label">{{ t('contact.form.message') }}</label>
        <textarea
          id="message"
          v-model="form.message"
          required
          rows="5"
          :placeholder="t('contact.form.messagePlaceholder')"
          class="field-input"
        />
      </div>

      <!-- Honeypot: invisible to people and screen readers; bots fill it. -->
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <label for="website">Website</label>
        <input id="website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" >
      </div>

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
          {{ t('contact.form.consentRequired') }}
        </p>
      </div>

      <button
        type="submit"
        :disabled="status === 'sending'"
        class="btn-primary w-full"
      >
        {{ status === 'sending' ? t('contact.form.sending') : t('contact.form.submit') }}
      </button>

      <p v-if="status === 'success'" class="text-sm text-center text-green-700">
        {{ t('contact.form.success') }}
      </p>
      <p v-if="status === 'error'" class="text-sm text-center text-red-600" role="alert">
        {{ t(errorKey) }}
      </p>
    </form>
  </div>
</template>
