<script setup lang="ts">
import { createActualSchema } from '~~/shared/schemas/task-actual.schema'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  task?: any
  initialDate?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { apiFetch } = useAuth()
const toast = useToast()

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
    state.completionPct = task.completionPct || 0
    state.status = 'DONE'
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
  } else if (!isRoutine.value) {
     // Reset for new records in projects
     state.completionPct = 0
     state.status = 'DONE'
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
      toast.add({ title: isEditMode.value ? 'Update successful!' : 'Progress submitted!', color: 'success' })
      emit('success')
      open.value = false
    }
  } catch (err: any) {
    toast.add({ title: 'Submission failed', description: err.data?.statusMessage, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEditMode ? 'Update Progress' : 'Submit Progress Update'" :description="isEditMode ? 'Edit your existing record for this date' : 'Report your achievement for this period'">
    <template #content>
      <UForm :schema="createActualSchema" :state="state" @submit="onSubmit" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Report Date" name="actualDate">
            <UInput v-model="state.actualDate" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Frequency" name="updateType">
            <!-- Lock frequency if it's a Routine task -->
            <UInput v-if="isRoutine" :model-value="state.updateType" disabled class="w-full" />
            <USelect v-else v-model="state.updateType" :items="['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Work Status" name="status">
          <USelect v-model="state.status" :items="['DONE', 'PARTIAL', 'NOT_DONE']" class="w-full" />
        </UFormField>

        <!-- Only show Slider for Project tasks. For Routine, it's auto-set by status -->
        <UFormField v-if="!isRoutine" :label="`Completion Percentage (${state.completionPct}%)`" name="completionPct">
          <div class="space-y-2">
            <UInput v-model.number="state.completionPct" type="range" :min="0" :max="100" />
            <div class="flex justify-between text-xs text-neutral-500">
              <span>0%</span>
              <span class="font-bold text-primary">{{ state.completionPct }}%</span>
              <span>100%</span>
            </div>
          </div>
        </UFormField>

        <!-- Small indicator for Routine task % -->
        <div v-else class="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
            <span class="text-sm font-medium">Auto-set Completion:</span>
            <UBadge :label="`${state.completionPct}%`" variant="subtle" color="primary" />
        </div>

        <UFormField label="Note / Remark" name="note">
          <UTextarea v-model="state.note" placeholder="What was done? Any issues?" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-3 pt-4">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
          <UButton type="submit" label="Save Changes" :loading="loading" color="primary" class="px-6 font-bold" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
