<script setup lang="ts">
import { privacyPolicy, type Locale } from '~/content/legal'

const { locale } = useI18n()

useSeoPage({ titleKey: 'legal.privacy.seo.title', descriptionKey: 'legal.privacy.seo.description' })

const doc = computed(() => privacyPolicy[locale.value as Locale])
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
