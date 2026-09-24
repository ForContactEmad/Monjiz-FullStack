<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
useSeoPage({ titleKey: 'account.register.title', descriptionKey: 'account.register.subtitle', noindex: true })

const { refresh } = await useClientAccount()

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  phone: '',
  company_name: '',
  consent: false,
  website: '', // honeypot
})
const busy = ref(false)
const errorKey = ref('')

async function submit() {
  busy.value = true
  errorKey.value = ''
  try {
    await $fetch('/api/client/register', {
      method: 'POST',
      body: { ...form, consentPrivacy: form.consent },
    })
    await refresh()
    await navigateTo((route.query.redirect as string) || localePath('/account'))
  } catch (err) {
    errorKey.value = accountErrorKey(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-16">
    <h1 class="text-2xl font-heading font-bold">{{ t('account.register.title') }}</h1>
    <p class="mt-2 text-sm text-neutral-600">{{ t('account.register.subtitle') }}</p>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <div>
        <label for="r-name" class="field-label">{{ t('account.register.name') }}</label>
        <input id="r-name" v-model="form.full_name" required minlength="2" maxlength="100" autocomplete="name" class="field-input">
      </div>
      <div>
        <label for="r-email" class="field-label">{{ t('account.register.email') }}</label>
        <input id="r-email" v-model.trim="form.email" type="email" required autocomplete="email" class="field-input" dir="ltr">
      </div>
      <div>
        <label for="r-password" class="field-label">{{ t('account.register.password') }}</label>
        <input id="r-password" v-model="form.password" type="password" required minlength="10" autocomplete="new-password" class="field-input" dir="ltr">
        <p class="mt-1 text-xs text-neutral-500">{{ t('account.register.passwordHint') }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="r-phone" class="field-label">{{ t('account.register.phone') }}</label>
          <input id="r-phone" v-model.trim="form.phone" type="tel" autocomplete="tel" class="field-input" dir="ltr">
        </div>
        <div>
          <label for="r-company" class="field-label">{{ t('account.register.company') }}</label>
          <input id="r-company" v-model.trim="form.company_name" maxlength="150" autocomplete="organization" class="field-input">
        </div>
      </div>

      <!-- Honeypot: hidden from people, filled by bots. -->
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <label for="r-website">Website</label>
        <input id="r-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off">
      </div>

      <label class="flex items-start gap-2 text-sm">
        <input v-model="form.consent" type="checkbox" class="mt-0.5">
        <span>
          {{ t('forms.consentPrefix') }}
          <NuxtLink :to="localePath('/privacy')" target="_blank" class="text-accent-600 hover:underline">
            {{ t('footer.privacy') }}
          </NuxtLink>
        </span>
      </label>

      <p v-if="errorKey" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="busy || !form.consent">
        {{ busy ? t('account.register.submitting') : t('account.register.submit') }}
      </button>

      <p class="text-sm text-center text-neutral-600">
        {{ t('account.register.haveAccount') }}
        <NuxtLink :to="localePath('/account/login')" class="text-accent-600 hover:underline">
          {{ t('account.register.loginLink') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
