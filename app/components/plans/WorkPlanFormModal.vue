<script setup lang="ts">
const { t } = useI18n()
import { updateWorkPlanSchema } from '~~/shared/schemas/work-plan.schema'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  plan?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { update } = useWorkPlan()
const { apiFetch } = useAuth()
const toast = useToast()

const state = reactive({
  title: '',
  description: '',
  year: new Date().getFullYear(),
  planStartDate: '',
  planEndDate: '',
  departmentId: ''
})

const loading = ref(false)
const loadingDepts = ref(false)
const departments = ref<any[]>([])

async function fetchDepartments() {
  loadingDepts.value = true
  try {
    const res = await apiFetch<any>('/api/departments?limit=100')
    if (res.success) {
      departments.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch departments', err)
  } finally {
    loadingDepts.value = false
  }
}

watch(open, (val) => {
  if (val) {
    fetchDepartments()
    if (props.plan) {
      state.title = props.plan.title
      state.description = props.plan.description || ''
      state.year = props.plan.year
      state.planStartDate = props.plan.planStartDate?.split('T')[0] || ''
      state.planEndDate = props.plan.planEndDate?.split('T')[0] || ''
      state.departmentId = props.plan.departmentId
    }
  }
})

async function onSubmit(event: FormSubmitEvent<any>) {
  if (!props.plan?.id) return

  loading.value = true
  try {
    await update(props.plan.id, state as any)
    toast.add({ title: t('common.success'), color: 'success' })
    emit('success')
    open.value = false
  } catch (err: any) {
    toast.add({ title: t('common.error'), description: err.data?.statusMessage, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Edit Work Plan" description="Update basic information for this work plan">
    <template #content>
      <UForm :schema="updateWorkPlanSchema" :state="state" @submit="onSubmit" class="p-6 space-y-4">
        <UFormField :label="t('plans.title')" name="title">
          <UInput v-model="state.title" class="w-full" />
        </UFormField>

        <UFormField :label="t('common.description')" name="description">
          <UTextarea v-model="state.description" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('common.year')" name="year">
            <UInput v-model.number="state.year" type="number" class="w-full" />
          </UFormField>

          <UFormField :label="t('plans.department')" name="departmentId">
            <USelect
              v-model="state.departmentId"
              :items="departments"
              label-key="name"
              value-key="id"
              :loading="loadingDepts"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Start Date" name="planStartDate">
            <UInput v-model="state.planStartDate" type="date" class="w-full" />
          </UFormField>

          <UFormField label="End Date" name="planEndDate">
            <UInput v-model="state.planEndDate" type="date" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="open = false" />
          <UButton type="submit" :label="t('common.save')" :loading="loading" color="primary" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
