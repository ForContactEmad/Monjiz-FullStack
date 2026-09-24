<script setup lang="ts">
/**
 * Modal form used by every "add / edit" in the dashboard. Built on the
 * native <dialog> element: focus trapping, Escape-to-close and screen
 * reader semantics come for free. The form content goes in the slot.
 */
const props = defineProps<{ title: string; busy?: boolean; errorKey?: string }>()
const emit = defineEmits<{ submit: [] }>()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement | null>(null)

defineExpose({
  open: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
})
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(94vw,36rem)] max-h-[90vh] rounded-lg bg-surface text-text shadow-lg backdrop:bg-black/40"
  >
    <form class="p-6 space-y-4" @submit.prevent="emit('submit')">
      <h2 class="text-lg font-heading font-bold">{{ props.title }}</h2>
      <slot />
      <p v-if="props.errorKey" class="text-sm text-red-700 dark:text-red-300" role="alert">{{ t(props.errorKey) }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" class="px-4 py-2 rounded-md border border-divider" @click="dialog?.close()">
          {{ t('dashboard.cancel') }}
        </button>
        <button type="submit" class="btn-primary" :disabled="props.busy">
          {{ t('dashboard.common.save') }}
        </button>
      </div>
    </form>
  </dialog>
</template>
