<script setup lang="ts">
const { t } = useI18n()
import { createActualSchema } from '~~/shared/schemas/task-actual.schema'
import type { FormSubmitEvent } from '#ui/types'
import { format } from 'date-fns'

const props = defineProps<{
  task?: any
  initialDate?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { apiFetch } = useAuth()
const toast = useToast()

const sortedActuals = computed(() => {
  if (!props.task?.actuals) return []
  return [...props.task.actuals].sort((a, b) =>
    new Date(b.actualDate).getTime() - new Date(a.actualDate).getTime()
  )
})

function getStatusColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'NOT_DONE') return 'error'
  return 'neutral'
}

const state = reactive({
  updateType: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  actualDate: props.initialDate || new Date().toISOString().split('T')[0],
  actualStart: '',
  actualEnd: '',
  actualDays: 1,
  completionPct: 0,
  status: 'DONE' as 'DONE' | 'PARTIAL' | 'NOT_DONE',
  note: ''
})

const existingRecord = computed(() => {
  if (!props.task?.actuals || !state.actualDate) return null
  return props.task.actuals.find((a: any) => {
    const d1 = new Date(a.actualDate).toISOString().split('T')[0]
    return d1 === state.actualDate
  })
})

const isEditMode = computed(() => !!existingRecord.value)

const isRoutine = computed(() => props.task?.taskType === 'ROUTINE')

watch(() => props.task, (task) => {
  if (task) {
    state.updateType = (task.recurrenceType || 'DAILY') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    state.status = 'DONE'
    if (isRoutine.value) {
      state.completionPct = 100
    } else {
      state.completionPct = task.completionPct || 0
    }
    if (props.initialDate) {
      state.actualDate = props.initialDate
    }
  }
}, { immediate: true })

watch(() => props.initialDate, (date) => {
  if (date) {
    state.actualDate = date
  }
})

// Load existing data if record exists for this date
watch(existingRecord, (record) => {
  if (record) {
    state.status = record.status
    state.completionPct = Number(record.completionPct)
    state.note = record.note || ''
    state.updateType = record.updateType || state.updateType
  } else {
     // Reset for new records
     state.status = 'DONE'
     state.completionPct = isRoutine.value ? 100 : 0
     state.note = ''
  }
}, { immediate: true })

// Auto-map status to % for Routine tasks to make it faster
watch(() => state.status, (newStatus) => {
  if (isRoutine.value) {
    if (newStatus === 'DONE') state.completionPct = 100
    else if (newStatus === 'PARTIAL') state.completionPct = 50
    else if (newStatus === 'NOT_DONE') state.completionPct = 0
  }
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<any>) {
  if (!props.task?.id) return

  loading.value = true
  try {
    const url = isEditMode.value
      ? `/api/plan-tasks/${props.task.id}/actuals/${existingRecord.value.id}`
      : `/api/plan-tasks/${props.task.id}/actuals`

    const method = isEditMode.value ? 'PATCH' : 'POST'

    const res = await apiFetch<any>(url, {
      method,
      body: state
    })

    if (res.success) {
      toast.add({ title: t('common.success'), color: 'success' })
      emit('success')
      open.value = false
    }
  } catch (err: any) {
    const errorMsg = (err.data?.statusMessage || 'common.error_internal').trim()
    console.log('[API_ERROR_DEBUG]:', errorMsg)

    // Attempt translation of the message slug
    toast.add({
      title: t('common.error'),
      description: t(errorMsg),
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEditMode ? t('tasks.update_progress') : t('tasks.report_progress')" :description="t('common.details')">
    <template #content>
      <UForm :schema="createActualSchema" :state="state" @submit="onSubmit" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('common.date')" name="actualDate">
            <DatePicker v-model="state.actualDate" class="w-full" />
          </UFormField>

          <UFormField :label="t('tasks.frequency')" name="updateType">
            <!-- Lock frequency if it's a Routine task -->
            <UInput v-if="isRoutine" :model-value="state.updateType" disabled class="w-full" />
            <USelect v-else v-model="state.updateType" :items="['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="t('common.status')" name="status">
          <USelect
            v-model="state.status"
            :items="[
              { label: t('tasks.status_done'), value: 'DONE' },
              { label: t('tasks.status_partial'), value: 'PARTIAL' },
              { label: t('tasks.status_not_done'), value: 'NOT_DONE' }
            ]"
            class="w-full"
          />
        </UFormField>

        <!-- Only show Slider for Project tasks. For Routine, it's auto-set by status -->
        <UFormField v-if="!isRoutine" :label="t('tasks.completion')" name="completionPct">
          <div class="space-y-4">
            <div class="flex items-center gap-4">
                <UInput v-model.number="state.completionPct" type="number" min="0" max="100" class="w-24" size="lg">
                    <template #trailing>
                        <span class="text-neutral-400 text-xs">%</span>
                    </template>
                </UInput>
                <UInput v-model.number="state.completionPct" type="range" :min="0" :max="100" class="flex-1" />
            </div>

            <div class="flex flex-wrap gap-2">
                <UButton
                    v-for="val in [0, 25, 50, 75, 100]"
                    :key="val"
                    :label="`${val}%`"
                    variant="soft"
                    size="xs"
                    color="neutral"
                    @click="state.completionPct = val"
                    :class="state.completionPct === val ? 'ring-2 ring-primary bg-primary-100 dark:bg-primary-900 border-primary-500' : ''"
                />
            </div>
          </div>
        </UFormField>

        <!-- Small indicator for Routine task % -->
        <div v-else class="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
            <span class="text-sm font-medium">{{ t('tasks.completion') }}:</span>
            <UBadge :label="`${state.completionPct}%`" variant="subtle" color="primary" />
        </div>

        <UFormField :label="t('common.description')" name="note">
          <UTextarea v-model="state.note" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="open = false" />
          <UButton type="submit" :label="t('common.save')" :loading="loading" color="primary" class="px-6 font-bold" />
        </div>

        <!-- History Section -->
        <div v-if="sortedActuals.length > 0" class="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div class="flex items-center gap-2 mb-4 text-neutral-900 dark:text-white">
            <UIcon name="i-heroicons-history" class="w-5 h-5 text-primary" />
            <h4 class="font-bold font-heading">{{ t('tasks.history') }}</h4>
            <UBadge :label="sortedActuals.length" variant="soft" color="neutral" size="sm" class="ml-auto" />
          </div>

          <div class="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
            <div
              v-for="actual in sortedActuals"
              :key="actual.id"
              class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800 hover:border-primary-100 dark:hover:border-primary-900 transition-all group"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-xs font-black text-neutral-400 group-hover:text-primary transition-colors uppercase tracking-widest">
                  {{ formatDate(actual.actualDate) }}
                </span>
                <p v-if="actual.note" class="text-xs text-neutral-500 italic line-clamp-1">"{{ actual.note }}"</p>
                <p v-else class="text-xs text-neutral-400 opacity-50">{{ t('common.none') }}</p>
              </div>

              <div class="flex items-center gap-3 text-right">
                <div class="flex flex-col items-end">
                  <UBadge
                    :label="t(`tasks.status_${actual.status.toLowerCase()}`)"
                    :color="getStatusColor(actual.status)"
                    variant="soft"
                    size="sm"
                    class="font-extrabold uppercase tracking-tighter"
                  />
                  <span class="text-[10px] font-bold text-neutral-400 mt-0.5">{{ actual.completionPct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
