<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const { plans, loading, fetchPlans, remove } = useWorkPlan()
const { hasRole } = useAuth()
const toast = useToast()

const filters = reactive({
  year: new Date().getFullYear(),
  status: 'ALL'
})

const years = [2024, 2025, 2026]
const statuses = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Closed', value: 'CLOSED' }
]

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UProgress = resolveComponent('UProgress')

onMounted(() => {
  fetchPlans(filters)
})

watch(filters, () => {
  fetchPlans(filters)
}, { deep: true })

const canCreate = hasRole(['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'title',
    header: 'Plan Title',
    cell: ({ row }: any) => h(resolveComponent('NuxtLink'), {
        to: `/plans/${row.original.id}`,
        class: 'font-bold cursor-pointer text-primary hover:underline'
    }, () => row.getValue('title'))
  },
  {
    accessorKey: 'department',
    header: 'Dept',
    cell: ({ row }: any) => (row.getValue('department') as any)?.name || '-'
  },
  {
    accessorKey: 'year',
    header: 'Year'
  },
  {
    accessorKey: 'tasks',
    header: 'Tasks',
    cell: ({ row }: any) => h('div', { class: 'flex gap-1' }, [
        h(UBadge, { label: 'PRJ', color: 'neutral', variant: 'soft', size: 'sm' }),
        h(UBadge, { label: 'RTN', color: 'neutral', variant: 'soft', size: 'sm' })
    ])
  },
  {
    accessorKey: 'status',
    header: 'Progress',
    cell: () => h(UProgress, { value: Math.floor(Math.random() * 100), class: 'w-20' })
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }: any) => {
      const status = row.getValue('status') as string
      return h(UBadge, {
        label: status,
        color: status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'neutral' : 'info',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: any) => {
      return h('div', { class: 'flex justify-end gap-2' }, [
        h(UButton, {
          icon: 'i-heroicons-eye',
          variant: 'ghost',
          color: 'neutral',
          to: `/plans/${row.original.id}`
        }),
        h(UButton, {
          icon: 'i-heroicons-pencil',
          variant: 'ghost',
          color: 'neutral',
          onClick: (e: Event) => {
            e.stopPropagation()
            openEditModal(row.original)
          }
        }),
        canCreate.value ? h(UButton, {
          icon: 'i-heroicons-trash',
          variant: 'ghost',
          color: 'error',
          onClick: (e: Event) => {
            e.stopPropagation()
            confirmDelete(row.original.id)
          }
        }) : null
      ])
    }
  }
]

const isDeleteModalOpen = ref(false)
const planToDelete = ref<string | null>(null)

const isEditModalOpen = ref(false)
const selectedPlan = ref<any>(null)

function openEditModal(plan: any) {
  selectedPlan.value = plan
  isEditModalOpen.value = true
}

function confirmDelete(id: string) {
  planToDelete.value = id
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!planToDelete.value) return
  try {
    await remove(planToDelete.value)
    toast.add({ title: 'Plan deleted successfully', color: 'success' })
    isDeleteModalOpen.value = false
  } catch (err) {
    toast.add({ title: 'Failed to delete plan', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-white">
    <PlansWorkPlanFormModal
      v-model:open="isEditModalOpen"
      :plan="selectedPlan"
      @success="fetchPlans(filters)"
    />
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold font-heading">Work Plans</h1>
        <p class="text-neutral-500 font-medium">Manage organizational work structures and activities</p>
      </div>
      <UButton v-if="canCreate" to="/plans/create" icon="i-heroicons-plus" color="primary" class="font-bold">
        New Plan
      </UButton>
    </div>

    <!-- Filter Bar -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <USelect v-model="filters.year" :items="years" class="w-32" />
        <USelect v-model="filters.status" :items="statuses" label-key="label" value-key="value" placeholder="All Statuses" class="w-48" />
      </div>
    </UCard>

    <!-- Plans Table -->
    <UCard class="overflow-hidden">
      <UTable :data="plans" :columns="columns" :loading="loading" />
    </UCard>

    <!-- Delete Confirmation -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirm Deletion">
      <template #content>
        <div class="p-6">
            <h3 class="text-xl font-bold mb-2">Delete Plan?</h3>
            <p class="text-neutral-500 mb-6 font-medium">Are you sure you want to delete this work plan? This action cannot be revoked and all associated data will be hidden.</p>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
              <UButton color="error" class="font-bold" @click="handleDelete">Delete Forever</UButton>
            </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
