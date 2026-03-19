<script setup lang="ts">
const props = defineProps<{
  showDepartment?: boolean
  showWorkPlan?: boolean
}>()

const emit = defineEmits(['change'])

const { apiFetch, role, user } = useAuth()

const filters = ref({
  year: new Date().getFullYear(),
  companyId: '',
  departmentId: '',
  workPlanId: ''
})

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)
const companies = ref<any[]>([])
const departments = ref<any[]>([])
const workPlans = ref<any[]>([])

const fetchCompanies = async () => {
    if (role.value === 'SUPER_ADMIN') {
        try {
            const res = await apiFetch<any>('/api/companies')
            if (res.success) {
                companies.value = res.data
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err)
        }
    }
}

const fetchDepartments = async () => {
  if (role.value === 'SUPER_ADMIN' || role.value === 'ADMIN_COMPANY') {
    try {
      const params: any = {}
      if (filters.value.companyId) params.companyId = filters.value.companyId
      
      const res = await apiFetch<any>('/api/departments', { params })
      if (res.success) {
        departments.value = res.data
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }
}

const fetchWorkPlans = async () => {
  try {
    const params: any = { year: filters.value.year }
    if (filters.value.departmentId) params.departmentId = filters.value.departmentId
    
    const res = await apiFetch<any>('/api/work-plans', { params })
    if (res.success) {
      workPlans.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch work plans:', err)
  }
}

watch(() => filters.value.year, () => {
  if (props.showWorkPlan) fetchWorkPlans()
  emit('change', { ...filters.value })
})

watch(() => filters.value.companyId, () => {
  filters.value.departmentId = ''
  filters.value.workPlanId = ''
  fetchDepartments()
  emit('change', { ...filters.value })
})

watch(() => filters.value.departmentId, () => {
  if (props.showWorkPlan) {
    filters.value.workPlanId = ''
    fetchWorkPlans()
  }
  emit('change', { ...filters.value })
})

watch(() => filters.value.workPlanId, () => {
  emit('change', { ...filters.value })
})

onMounted(() => {
  if (role.value === 'SUPER_ADMIN') fetchCompanies()
  if (props.showDepartment) fetchDepartments()
  if (props.showWorkPlan) fetchWorkPlans()
  
  // Set initial department if user is MANAGER
  if (role.value === 'MANAGER' && user.value?.departmentId) {
      filters.value.departmentId = user.value.departmentId
  }
})
</script>

<template>
  <div class="flex flex-wrap gap-4 items-end bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm print:hidden">
    <UFormGroup label="Year" class="w-32">
      <USelect v-model="filters.year" :items="years" />
    </UFormGroup>

    <UFormGroup v-if="role === 'SUPER_ADMIN'" label="Company" class="w-64">
      <USelect v-model="filters.companyId" :items="companies" label-key="name" value-key="id" placeholder="All Companies" />
    </UFormGroup>

    <UFormGroup v-if="showDepartment && (role === 'SUPER_ADMIN' || role === 'ADMIN_COMPANY')" label="Department" class="w-64">
      <USelect v-model="filters.departmentId" :items="departments" label-key="name" value-key="id" placeholder="All Departments" />
    </UFormGroup>

    <UFormGroup v-if="showWorkPlan" label="Work Plan" class="w-64">
      <USelect v-model="filters.workPlanId" :items="workPlans" label-key="name" value-key="id" placeholder="All Plans" />
    </UFormGroup>

    <slot name="extra" />
  </div>
</template>
