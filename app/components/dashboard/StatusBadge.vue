<script setup lang="ts">
import type { MessageStatus, RequestStatus } from '#shared/types/admin'

const props = defineProps<{ status: RequestStatus | MessageStatus; kind?: 'request' | 'message' }>()
const { t } = useI18n()

// Colour carries meaning at a glance; the text label is always shown too,
// so nothing relies on colour alone.
const tones: Record<string, string> = {
  new: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  reviewing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  quoted: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  in_progress: 'bg-accent-100 text-accent-800',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  cancelled: 'bg-neutral-200 text-neutral-700',
  read: 'bg-neutral-200 text-neutral-700',
  replied: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
}
const label = computed(() =>
  props.kind === 'message' ? t(`dashboard.messageStatus.${props.status}`) : t(`dashboard.status.${props.status}`)
)
</script>

<template>
  <span class="inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium" :class="tones[props.status]">
    {{ label }}
  </span>
</template>
