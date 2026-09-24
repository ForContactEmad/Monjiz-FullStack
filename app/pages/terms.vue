<script setup lang="ts">
import { termsAndConditions, type Locale } from '~/content/legal'

const { locale } = useI18n()

useSeoPage({ titleKey: 'legal.terms.seo.title', descriptionKey: 'legal.terms.seo.description' })

const doc = computed(() => termsAndConditions[locale.value as Locale])
</script>

<template>
  <LegalDocument :doc="doc" />
</template>
