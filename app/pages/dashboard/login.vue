<script setup lang="ts">
definePageMeta({ layout: 'auth', middleware: 'admin' })

const { t } = useI18n()
const localePath = useLocalePath()
const { request } = useAdminApi()
useHead({ title: () => t('dashboard.login.title') })

const email = ref('')
const password = ref('')
const busy = ref(false)
const errorKey = ref('')

async function submit() {
  busy.value = true
  errorKey.value = ''
  try {
    await request('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    password.value = ''
    await navigateTo(localePath('/dashboard/mfa'))
  } catch (err) {
    errorKey.value = adminErrorKey(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-lg font-heading font-bold">{{ t('dashboard.login.title') }}</h1>
    <p class="text-sm text-neutral-600 mt-1">{{ t('dashboard.login.subtitle') }}</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <div>
        <label for="email" class="field-label">{{ t('dashboard.login.email') }}</label>
        <input id="email" v-model="email" type="email" required autocomplete="username" class="field-input" >
      </div>
      <div>
        <label for="password" class="field-label">{{ t('dashboard.login.password') }}</label>
        <input id="password" v-model="password" type="password" required autocomplete="current-password" class="field-input" >
      </div>
      <p v-if="errorKey" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ t(errorKey) }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="busy">
        {{ busy ? t('dashboard.login.submitting') : t('dashboard.login.submit') }}
      </button>
    </form>
  </div>
</template>
