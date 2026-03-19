<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { DepartmentSchema } from '~~/shared/schemas/department.schema'

const props = defineProps<{
  department?: any // Edit mode if department is provided
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success', 'close'])

const { apiFetch, role } = useAuth()
const loading = ref(false)
const companies = ref<any[]>([])
const loadingCompanies = ref(false)

const state = reactive({
  name: '',
  code: '',
  companyId: ''
})

// Extended schema for the form (includes companyId for SUPER_ADMIN)
const FormSchema = computed(() => {
  if (role.value === 'SUPER_ADMIN' && !props.department) {
    return DepartmentSchema.extend({
      companyId: z.string().uuid('Company is required')
    })
  }

  // For other roles or editing, companyId is optional or already set
  return DepartmentSchema.extend({
    companyId: z.string().uuid().optional().or(z.literal(''))
  })
})

async function fetchCompanies() {
  if (role.value !== 'SUPER_ADMIN') return
  loadingCompanies.value = true
  try {
    const res = await apiFetch<any>('/api/companies?limit=100')
    if (res.success) {
      companies.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch companies', err)
  } finally {
    loadingCompanies.value = false
  }
}

// Reset form
watch(() => props.department, (newVal) => {
  if (newVal) {
    state.name = newVal.name || ''
    state.code = newVal.code || ''
    state.companyId = newVal.companyId || ''
  } else {
    state.name = ''
    state.code = ''
    state.companyId = ''
  }
}, { immediate: true })

// Clear form on close
watch(open, (isOpen) => {
  if (isOpen) {
    if (role.value === 'SUPER_ADMIN') {
      fetchCompanies()
    }
  } else if (!props.department) {
    state.name = ''
    state.code = ''
    state.companyId = ''
  }
})

async function onSubmit(event: FormSubmitEvent<any>) {
  loading.value = true
  try {
    const url = props.department ? `/api/departments/${props.department.id}` : '/api/departments'
    const method = props.department ? 'PATCH' : 'POST'

    const body: any = {
      name: state.name,
      code: state.code
    }

    if (role.value === 'SUPER_ADMIN' && state.companyId && !props.department) {
      body.companyId = state.companyId
    }

    await apiFetch(url, {
      method,
      body
    })

    useToast().add({ title: 'Success', description: `Department saved successfully`, color: 'success' })
    emit('success')
    open.value = false
  } catch (err: any) {
    useToast().add({ title: 'Error', description: err.data?.statusMessage || err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="department ? 'Edit Department' : 'Create Department'" :description="department ? `Editing ${department.name}` : 'Add a new department to the system'">
    <template #content>
      <UForm :schema="FormSchema" :state="state" class="p-6 space-y-4" @submit="onSubmit">
        <h3 class="text-lg font-semibold mb-4">{{ department ? 'Edit Department' : 'Create Department' }}</h3>

        <UFormField v-if="role === 'SUPER_ADMIN' && !department" label="Company" name="companyId">
          <USelect
            v-model="state.companyId"
            :items="companies"
            label-key="name"
            value-key="id"
            placeholder="Select a company"
            :loading="loadingCompanies"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Department Name" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="Enter department name" />
        </UFormField>

        <UFormField label="Department Code" name="code">
          <UInput
            v-model="state.code"
            class="w-full uppercase"
            placeholder="e.g. HR, IT"
            @update:model-value="val => state.code = val.toUpperCase()"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false; $emit('close')" />
          <UButton type="submit" :label="department ? 'Update' : 'Save'" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
