<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types'
import { z } from 'zod'

const props = defineProps<{
  planId: string
  currentSupervisors: any[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { apiFetch } = useAuth()
const toast = useToast()

const state = reactive({
  supervisorId: ''
})

const schema = z.object({
  supervisorId: z.string().min(1, 'Please select a supervisor')
})

const loading = ref(false)
const loadingUsers = ref(false)
const potentialSupervisors = ref<any[]>([])

async function fetchSupervisors() {
  loadingUsers.value = true
  try {
    // Get all users in department, filtering logic could be implemented on backend, 
    // but here we get valid active users
    const res = await apiFetch<any>('/api/users?limit=100')
    if (res.success) {
      // Filter out users already assigned
      const assignedIds = props.currentSupervisors.map(s => s.supervisorId)
      potentialSupervisors.value = res.data.filter((u: any) => 
        u.isActive && 
        u.role === 'SUPERVISOR' &&
        !assignedIds.includes(u.id)
      ).map((u: any) => ({
        ...u,
        fullName: `${u.firstName} ${u.lastName}`
      }))
    }
  } catch (err) {
    console.error('Failed to fetch supervisors', err)
  } finally {
    loadingUsers.value = false
  }
}

watch(open, (val) => {
  if (val) {
    fetchSupervisors()
    state.supervisorId = ''
  }
})

async function onSubmit() {
  if (!state.supervisorId) return
  
  loading.value = true
  try {
    const res = await apiFetch<any>(`/api/work-plans/${props.planId}/supervisors`, {
      method: 'POST',
      body: { supervisorId: state.supervisorId }
    })
    
    if (res.success) {
      toast.add({ title: 'Supervisor assigned successfully', color: 'success' })
      emit('success')
      open.value = false
    }
  } catch (err: any) {
    toast.add({ title: 'Failed to assign supervisor', description: err.data?.statusMessage, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Assign Supervisor" description="Select a supervisor to assign to this work plan">
    <template #content>
      <UForm :schema="schema" :state="state" @submit="onSubmit" class="p-6 space-y-4">
        <UFormField label="Select Supervisor" name="supervisorId">
          <USelect
            v-model="state.supervisorId"
            :items="potentialSupervisors"
            :loading="loadingUsers"
            label-key="fullName"
            value-key="id"
            placeholder="Choose a supervisor..."
            class="w-full"
          />
        </UFormField>

        <div v-if="potentialSupervisors.length === 0 && !loadingUsers" class="text-sm text-neutral-500 italic mt-2">
          No available supervisors found in your department.
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false" />
          <UButton type="submit" label="Assign Supervisor" :loading="loading" color="primary" :disabled="!state.supervisorId" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
