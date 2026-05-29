<script setup lang="ts">
const { t } = useI18n()

type LatestUpdate = {
  actualDate?: string | null
  updateType?: string
  status?: string
  completionPct?: number
  note?: string
  attachmentUrl?: string
  updatedBy?: string
} | null

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  taskName?: string
  update?: LatestUpdate
}>()

const hasUpdate = computed(() => Boolean(props.update))
const attachmentName = computed(() => {
  if (!props.update?.attachmentUrl) return ''
  const parts = props.update.attachmentUrl.split('/')
  return parts[parts.length - 1] || props.update.attachmentUrl
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="taskName || t('tasks.title')"
    :description="hasUpdate ? t('reports.task_progress_desc') : t('common.none')"
  >
    <template #body>
      <div v-if="hasUpdate" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 mb-1">{{ t('common.date') }}</div>
            <div class="font-medium">{{ formatDate(update?.actualDate || '') }}</div>
          </div>
          <div class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 mb-1">{{ t('common.status') }}</div>
            <UBadge :label="update?.status || '-'" variant="soft" color="primary" />
          </div>
          <div class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 mb-1">{{ t('tasks.completion') }}</div>
            <div class="font-medium">{{ update?.completionPct || 0 }}%</div>
          </div>
          <div class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <div class="text-xs text-neutral-500 mb-1">{{ t('tasks.frequency') }}</div>
            <div class="font-medium">{{ update?.updateType || '-' }}</div>
          </div>
          <div class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 md:col-span-2">
            <div class="text-xs text-neutral-500 mb-1">{{ t('tasks.assign_to') }}</div>
            <div class="font-medium">{{ update?.updatedBy || '-' }}</div>
          </div>
        </div>

        <div class="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <div class="text-xs text-neutral-500 mb-1">{{ t('common.description') }}</div>
          <p class="text-sm whitespace-pre-wrap">{{ update?.note || '-' }}</p>
        </div>

        <div class="flex items-center justify-between p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
          <div class="text-sm truncate">
            <span class="text-neutral-500 mr-1">Attachment:</span>
            <span class="font-medium">{{ attachmentName || '-' }}</span>
          </div>
          <UButton
            v-if="update?.attachmentUrl"
            :to="update.attachmentUrl"
            target="_blank"
            icon="i-heroicons-paper-clip"
            size="sm"
            variant="soft"
          >
            Open
          </UButton>
        </div>
      </div>

      <div v-else class="text-sm text-neutral-500 py-4">
        {{ t('common.none') }}
      </div>
    </template>
  </UModal>
</template>
