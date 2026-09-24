<script setup lang="ts">
import type { LegalDoc } from '~/content/legal'
import { LEGAL_LAST_UPDATED } from '~/content/legal'

const props = defineProps<{ doc: LegalDoc }>()

const { t } = useI18n()
const localePath = useLocalePath()

const format = useFormat()
const lastUpdated = computed(() => format.date(LEGAL_LAST_UPDATED, 'date'))

/**
 * Splits a paragraph on the {contact} token so the template can render a
 * real link in its place: the public email if one is configured in
 * the dashboard settings, otherwise the /contact page. No v-html involved.
 */
function segments(text: string): { kind: 'text' | 'contact'; value: string }[] {
  return text
    .split('{contact}')
    .flatMap((part, i) =>
      i === 0 ? [{ kind: 'text' as const, value: part }] : [{ kind: 'contact' as const, value: '' }, { kind: 'text' as const, value: part }]
    )
    .filter((s) => s.kind === 'contact' || s.value)
}

const { site } = await usePublicSite()
const email = computed(() => site.value.settings.contact_email)
</script>

<template>
  <article class="max-w-3xl mx-auto px-4 py-16">
    <h1 class="text-3xl font-heading font-bold text-accent-800">{{ props.doc.title }}</h1>
    <p class="mt-2 text-sm text-neutral-500">{{ t('legal.lastUpdated') }}: {{ lastUpdated }}</p>

    <section v-for="section in props.doc.sections" :key="section.heading" class="mt-10">
      <h2 class="text-xl font-heading font-bold mb-3">{{ section.heading }}</h2>

      <template v-for="(block, i) in section.blocks" :key="i">
        <p v-if="block.type === 'p'" class="text-neutral-700 mb-3">
          <template v-for="(seg, j) in segments(block.text)" :key="j">
            <template v-if="seg.kind === 'text'">{{ seg.value }}</template>
            <a v-else-if="email" :href="`mailto:${email}`" class="text-accent-600 hover:underline">{{ email }}</a>
            <NuxtLink v-else :to="localePath('/contact')" class="text-accent-600 hover:underline">
              {{ t('legal.contactLink') }}
            </NuxtLink>
          </template>
        </p>

        <component
          :is="block.type"
          v-else
          class="mb-3 ps-5 space-y-1 text-neutral-700"
          :class="block.type === 'ul' ? 'list-disc' : 'list-decimal'"
        >
          <li v-for="(item, j) in block.items" :key="j">
            <template v-for="(seg, k) in segments(item)" :key="k">
              <template v-if="seg.kind === 'text'">{{ seg.value }}</template>
              <a v-else-if="email" :href="`mailto:${email}`" class="text-accent-600 hover:underline">{{ email }}</a>
              <NuxtLink v-else :to="localePath('/contact')" class="text-accent-600 hover:underline">
                {{ t('legal.contactLink') }}
              </NuxtLink>
            </template>
          </li>
        </component>
      </template>
    </section>
  </article>
</template>
