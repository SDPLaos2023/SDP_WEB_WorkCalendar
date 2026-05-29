<script setup lang="ts">
const { t } = useI18n()
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps<{
  user?: any // Edit mode if user is provided
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success', 'close'])

const session = useAuth()
const isSuperAdmin = computed(() => session.user.value?.role === 'SUPER_ADMIN')
const isManager = computed(() => session.user.value?.role === 'MANAGER')

// Create local schema because Zod with imports wasn't passing Nuxt bounds well
const baseSchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR', 'OFFICER']),
  departmentId: z.string().min(1, 'Required').optional().or(z.literal('')),
  companyId: z.string().min(1, 'Required').optional().or(z.literal('')),
  isActive: z.boolean().default(true)
})

type Schema = z.infer<typeof baseSchema>

const state = reactive({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  role: 'OFFICER' as 'SUPER_ADMIN' | 'ADMIN_COMPANY' | 'MANAGER' | 'SUPERVISOR' | 'OFFICER',
  departmentId: '',
  companyId: '',
  isActive: true
})

const companies = ref<{ label: string, value: string }[]>([])
const departments = ref<{ label: string, value: string }[]>([])

watch(open, async (val) => {
  if (val) {
    // Clear form if opening in "Create" mode
    if (!props.user) {
      state.firstName = ''
      state.lastName = ''
      state.username = ''
      state.email = ''
      state.role = 'OFFICER'
      state.departmentId = ''
      state.companyId = ''
      state.isActive = true
      state.password = ''
    }

    if (isSuperAdmin.value && companies.value.length === 0) {
      try {
        const res = await session.apiFetch<any>('/api/companies?limit=100')
        companies.value = (res.data || []).map((c: any) => ({ label: c.name, value: c.id }))
      } catch (e) {
        console.error('Failed to fetch companies', e)
      }
    }
    await fetchDepartments()
  }
})

watch(() => state.companyId, () => {
  if (open.value) {
    state.departmentId = ''
    fetchDepartments()
  }
})

async function fetchDepartments() {
  if (isSuperAdmin.value && !state.companyId) {
    departments.value = []
    return
  }

  try {
    const url = `/api/departments?limit=100${state.companyId ? `&companyId=${state.companyId}` : ''}`
    const res = await session.apiFetch<any>(url)
    departments.value = (res.data || []).map((d: any) => ({ label: d.name, value: d.id }))

    // If a company was changed and current department is not in the list, clear it
    if (state.departmentId && !departments.value.find(d => d.value === state.departmentId)) {
      state.departmentId = ''
    }
  } catch (e) {
    console.error('Failed to fetch departments', e)
  }
}

const loading = ref(false)
const showPassword = ref(false)

// Reset form
watch(() => props.user, (newVal) => {
  if (newVal) {
    state.firstName = newVal.firstName || ''
    state.lastName = newVal.lastName || ''
    state.username = newVal.username || ''
    state.email = newVal.email || ''
    state.role = newVal.role || 'OFFICER'
    state.departmentId = newVal.departmentId || ''
    state.companyId = newVal.companyId || ''
    state.isActive = newVal.isActive ?? true
    state.password = undefined as any // Clear password field for update
  } else {
    state.firstName = ''
    state.lastName = ''
    state.username = ''
    state.email = ''
    state.role = 'OFFICER'
    state.departmentId = ''
    state.companyId = ''
    state.isActive = true
    state.password = ''
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const url = props.user ? `/api/users/${props.user.id}` : '/api/users'
    const method = props.user ? 'PATCH' : 'POST'

    const body = { ...state }
    if (!body.password) {
      delete (body as any).password
    }
    if (!body.departmentId) {
      delete (body as any).departmentId
    }
    if (!isSuperAdmin.value) {
      delete (body as any).companyId
    } else if (!body.companyId) {
      delete (body as any).companyId
    }

    const res = await session.apiFetch(url, {
      method,
      body
    })

    useToast().add({ title: t('common.success'), description: `User saved successfully`, color: 'success' })
    emit('success')
    open.value = false
  } catch (err: any) {
    useToast().add({ title: t('common.error'), description: err.data?.statusMessage || err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="user ? t('common.edit') : t('common.create')" :description="user ? `Editing ${user.firstName} ${user.lastName}` : 'Add a new user to the system'">
    <template #content>
      <UForm :schema="baseSchema" :state="state" class="p-6 space-y-4" @submit="onSubmit">
        <h3 class="text-lg font-semibold mb-4">{{ user ? t('common.edit') : t('common.create') }}</h3>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('common.name')" name="firstName">
            <UInput v-model="state.firstName" class="w-full" placeholder="First Name" />
          </UFormField>

          <UFormField :label="t('common.name') + ' (Last)'" name="lastName">
            <UInput v-model="state.lastName" class="w-full" placeholder="Last Name" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Username" name="username">
            <UInput v-model="state.username" class="w-full" placeholder="username" />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" class="w-full" icon="i-heroicons-envelope" placeholder="email@example.com" />
          </UFormField>
        </div>

        <UFormField :label="user ? 'New Password (Optional)' : 'Password'" name="password">
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            class="w-full"
            icon="i-heroicons-lock-closed"
            placeholder="••••••••"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                class="-me-1"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('management.role')" name="role">
          <USelect
            v-model="state.role"
            :items="[
              ...(isSuperAdmin ? [{ label: 'Super Admin', value: 'SUPER_ADMIN' }, { label: 'Company Admin', value: 'ADMIN_COMPANY' }] : []),
              ...(!isManager ? [{ label: 'Manager', value: 'MANAGER' }] : []),
              { label: 'Supervisor', value: 'SUPERVISOR' },
              { label: 'Officer', value: 'OFFICER' }
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField v-if="isSuperAdmin" :label="t('management.company')" name="companyId">
          <USelect
            v-model="state.companyId"
            :items="companies"
            value-key="value"
            label-key="label"
            placeholder="Select a Company..."
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('management.department') + ' (Optional)'" name="departmentId">
          <USelect
            v-model="state.departmentId"
            :items="departments"
            value-key="value"
            label-key="label"
            :placeholder="isSuperAdmin && !state.companyId ? 'Select a company first' : 'Select a Department (Optional)'"
            :disabled="isSuperAdmin && !state.companyId"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('common.status')" name="isActive">
          <UCheckbox v-model="state.isActive" label="User operates in the system" />
        </UFormField>

        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="open = false; $emit('close')" />
          <UButton type="submit" :label="user ? t('common.save') : t('common.create')" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
