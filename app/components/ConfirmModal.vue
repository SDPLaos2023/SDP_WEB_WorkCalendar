<script setup lang="ts">
const { t } = useI18n()
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  color?: 'primary' | 'error' | 'neutral' | 'success' | 'warning'
  icon?: string
  loading?: boolean
}>(), {
  color: 'error',
  icon: 'i-lucide-alert-triangle'
})

const finalTitle = computed(() => props.title || t('plans.confirm_delete'))
const finalDescription = computed(() => props.description || t('plans.confirm_delete'))
const finalConfirm = computed(() => props.confirmLabel || t('common.submit'))
const finalCancel = computed(() => props.cancelLabel || t('common.cancel'))

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['confirm', 'close'])

function handleCancel() {
  open.value = false
  emit('close')
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <UModal v-model:open="open" :title="finalTitle" :description="finalDescription">
    <slot name="trigger" />

    <template #content>
      <div class="p-6">
        <div class="flex items-center gap-4 mb-6">
          <div :class="[
            'p-3 rounded-full flex items-center justify-center',
            color === 'error' ? 'bg-error-50 dark:bg-error-950/30 text-error' : 'bg-primary-50 dark:bg-primary-950/30 text-primary'
          ]">
            <UIcon :name="icon" class="size-6" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-highlighted">{{ finalTitle }}</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ finalDescription }}</p>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t border-default">
          <UButton
            :label="finalCancel"
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          />
          <UButton
            :label="finalConfirm"
            :color="color"
            variant="solid"
            :loading="loading"
            @click="handleConfirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
