<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
useSeoPage({ titleKey: 'account.login.title', descriptionKey: 'account.login.title', noindex: true })

const { refresh } = await useClientAccount()

const email = ref('')
const password = ref('')
const busy = ref(false)
const errorKey = ref('')

async function submit() {
  busy.value = true
  errorKey.value = ''
  try {
    await $fetch('/api/client/login', { method: 'POST', body: { email: email.value, password: password.value } })
    password.value = ''
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
  <div class="max-w-sm mx-auto px-4 py-16">
    <h1 class="text-2xl font-heading font-bold">{{ t('account.login.title') }}</h1>

    <form class="mt-8 space-y-4" @submit.prevent="submit">
      <div>
        <label for="l-email" class="field-label">{{ t('account.login.email') }}</label>
        <input id="l-email" v-model.trim="email" type="email" required autocomplete="email" class="field-input" dir="ltr">
      </div>
      <div>
        <label for="l-password" class="field-label">{{ t('account.login.password') }}</label>
        <input id="l-password" v-model="password" type="password" required autocomplete="current-password" class="field-input" dir="ltr">
      </div>
      <p v-if="errorKey" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="busy">
        {{ busy ? t('account.login.submitting') : t('account.login.submit') }}
      </button>
      <p class="text-sm text-center text-neutral-600">
        {{ t('account.login.noAccount') }}
        <NuxtLink :to="localePath('/account/register')" class="text-accent-600 hover:underline">
          {{ t('account.login.registerLink') }}
        </NuxtLink>
      </p>
    </form>
  </div>
</template>
