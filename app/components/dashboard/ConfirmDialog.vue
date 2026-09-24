<script setup lang="ts">
/**
 * Confirmation for destructive actions, on the native <dialog> element:
 * it traps focus, closes on Escape and is announced as a modal by screen
 * readers without any extra library.
 */
const props = defineProps<{ title: string; body: string; confirmLabel: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
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
    class="m-auto w-[min(92vw,28rem)] rounded-lg bg-surface text-text p-6 shadow-lg backdrop:bg-black/40"
  >
    <h2 class="text-lg font-heading font-bold">{{ props.title }}</h2>
    <p class="mt-2 text-sm text-neutral-600">{{ props.body }}</p>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="px-4 py-2 rounded-md border border-divider" @click="dialog?.close()">
        {{ t('dashboard.cancel') }}
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-md bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
        :disabled="props.busy"
        @click="emit('confirm')"
      >
        {{ props.confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
