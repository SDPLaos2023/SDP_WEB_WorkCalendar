<script setup lang="ts">
const { t } = useI18n()
import { createPlanTaskSchema, updatePlanTaskSchema } from '~~/shared/schemas/plan-task.schema'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  planId: string
  task?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { create, update } = usePlanTask()
const { apiFetch, user } = useAuth()
const toast = useToast()

const isEditMode = computed(() => !!props.task?.id)

const state = reactive({
  taskName: '',
  description: '',
  taskType: 'PROJECT' as 'PROJECT' | 'ROUTINE',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  assignedToId: '',
  plannedStart: '',
  plannedEnd: '',
  recurrenceType: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  recurrenceStart: '',
  recurrenceEnd: '',
  plannedWeeks: null as string | null
})

const loading = ref(false)
const loadingUsers = ref(false)
const officers = ref<any[]>([])

async function fetchOfficers() {
  loadingUsers.value = true
  try {
    const plan = useWorkPlan().current.value
    if (!plan?.departmentId) return

    const res = await apiFetch<any>(`/api/users?departmentId=${plan.departmentId}&limit=200`)
    if (res.success) {
      const allowedRoles = ['MANAGER', 'SUPERVISOR', 'OFFICER']
      const fetched = res.data.filter((u: any) => u.isActive && allowedRoles.includes(u.role)).map((u: any) => ({
         ...u,
         fullName: `${u.firstName} ${u.lastName} (${u.role})`
      }))

      if (user.value && allowedRoles.includes(user.value.role) && user.value.departmentId === plan.departmentId) {
        const meIndex = fetched.findIndex((u: any) => u.id === user.value?.id)
        if (meIndex >= 0) {
          fetched[meIndex].fullName += ' (Me)'
        } else {
          fetched.unshift({
             ...user.value,
             fullName: `${user.value.firstName} ${user.value.lastName} (${t('tasks.assign_me')})`
          })
        }
      }

      officers.value = fetched
    }
  } catch (err) {
    console.error('Failed to fetch users', err)
  } finally {
    loadingUsers.value = false
  }
}

watch(open, (val) => {
  if (val) {
    fetchOfficers()
    if (props.task) {
      state.taskName = props.task.taskName
      state.description = props.task.description || ''
      state.taskType = props.task.taskType
      state.priority = props.task.priority
      state.assignedToId = props.task.assignedToId
      state.plannedStart = props.task.plannedStart ? props.task.plannedStart.split('T')[0] : ''
      state.plannedEnd = props.task.plannedEnd ? props.task.plannedEnd.split('T')[0] : ''
      state.recurrenceType = props.task.recurrenceType || 'DAILY'
      state.recurrenceStart = props.task.recurrenceStart ? props.task.recurrenceStart.split('T')[0] : ''
      state.recurrenceStart = props.task.recurrenceStart ? props.task.recurrenceStart.split('T')[0] : ''
      state.recurrenceEnd = props.task.recurrenceEnd ? props.task.recurrenceEnd.split('T')[0] : ''
      state.plannedWeeks = props.task.plannedWeeks || null
    } else {
      // Reset
      state.taskName = ''
      state.description = ''
      state.taskType = 'PROJECT'
      state.priority = 'MEDIUM'
      state.assignedToId = ''
      state.plannedStart = ''
      state.plannedEnd = ''
      state.recurrenceType = 'DAILY'
      state.recurrenceStart = ''
      state.recurrenceEnd = ''
      state.plannedWeeks = null
    }
  }
})

async function onSubmit(event: FormSubmitEvent<any>) {
  loading.value = true
  try {
    const payload = { ...state }
    // Clean up conditional fields based on type
    if (state.taskType === 'PROJECT') {
      delete (payload as any).recurrenceType
      delete (payload as any).recurrenceStart
      delete (payload as any).recurrenceEnd
    } else {
      delete (payload as any).plannedStart
      delete (payload as any).plannedEnd
    }

    if (isEditMode.value) {
      await update(props.planId, props.task.id, payload as any)
      toast.add({ title: t('common.success'), color: 'success' })
    } else {
      await create(props.planId, payload as any)
      toast.add({ title: t('common.success'), color: 'success' })
    }
    emit('success')
    open.value = false
  } catch (err: any) {
    toast.add({ title: t('common.error'), description: err.data?.statusMessage, color: 'error' })
  } finally {
    loading.value = false
  }
}

function assignToMe() {
  if (user.value?.id) {
    // Ensure user is in the officers list (e.g. if API call failed or hasn't finished)
    const exists = officers.value.find((u: any) => u.id === user.value?.id)
    if (!exists) {
      officers.value.push({
        ...user.value,
        fullName: `${user.value.firstName} ${user.value.lastName} (${t('tasks.assign_me')})`
      })
    }
    state.assignedToId = user.value.id
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEditMode ? t('common.edit') : t('common.create')" :description="t('common.details')">
    <template #content>
      <UForm :schema="isEditMode ? updatePlanTaskSchema : createPlanTaskSchema" :state="state" @submit="onSubmit" class="p-6 space-y-4">

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('tasks.name')" name="taskName">
            <UInput v-model="state.taskName" class="w-full" />
          </UFormField>

          <UFormField :label="t('common.priority')" name="priority">
            <USelect v-model="state.priority" :items="['LOW', 'MEDIUM', 'HIGH', 'URGENT']" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="t('common.description')" name="description">
          <UTextarea v-model="state.description" class="w-full" />
        </UFormField>

        <!-- Dynamic Dropdown to Assign User -->
        <UFormField :label="t('tasks.assign_to')" name="assignedToId">
          <div class="flex gap-2 w-full">
            <USelect
              v-model="state.assignedToId"
              :items="officers"
              :loading="loadingUsers"
              label-key="fullName"
              value-key="id"
              placeholder="Select user to assign..."
              class="w-full flex-1"
            />
            <UButton
              v-if="user?.id"
              color="neutral"
              variant="subtle"
              icon="i-lucide-user-check"
              :label="t('tasks.assign_me')"
              @click.prevent="assignToMe"
            />
          </div>
        </UFormField>

        <UFormField :label="t('tasks.type')" name="taskType">
          <USelect v-model="state.taskType" :items="['PROJECT', 'ROUTINE']" class="w-full" />
        </UFormField>

        <!-- Project Fields -->
        <div v-if="state.taskType === 'PROJECT'" class="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <UFormField label="Planned Start" name="plannedStart">
            <UInput v-model="state.plannedStart" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Planned End" name="plannedEnd">
            <UInput v-model="state.plannedEnd" type="date" class="w-full" />
          </UFormField>
        </div>

        <!-- Routine Fields -->
        <div v-if="state.taskType === 'ROUTINE'" class="grid grid-cols-2 gap-4 mt-4 p-4 border rounded-xl bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <UFormField label="Recurrence Frequency" name="recurrenceType" class="col-span-2">
            <USelect v-model="state.recurrenceType" :items="['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']" class="w-full" />
          </UFormField>

          <UFormField label="Valid From" name="recurrenceStart">
            <UInput v-model="state.recurrenceStart" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Valid Until" name="recurrenceEnd">
            <UInput v-model="state.recurrenceEnd" type="date" class="w-full" />
          </UFormField>
        </div>

        <!-- Planned Weeks Selector (Gantt Selection) -->
        <UFormField name="plannedWeeks">
            <PlansPlannedWeeksSelector v-model="state.plannedWeeks" />
        </UFormField>

        <div class="sticky bottom-0 flex justify-end gap-3 pt-4 pb-4 -mx-6 -mb-6 px-6 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 z-10 transition-colors">
          <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="open = false" />
          <UButton type="submit" :label="isEditMode ? t('common.save') : t('common.create')" :loading="loading" color="primary" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
