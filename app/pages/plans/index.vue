<script setup lang="ts">
const { t } = useI18n()
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
const statuses = computed(() => [
  { label: t('common.all'), value: 'ALL' },
  { label: t('plans.status_draft'), value: 'DRAFT' },
  { label: t('plans.status_active'), value: 'ACTIVE' },
  { label: t('plans.status_closed'), value: 'CLOSED' }
])

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

const columns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'title',
    header: t('plans.title'),
    cell: ({ row }: any) => h(resolveComponent('NuxtLink'), {
        to: `/plans/${row.original.id}`,
        class: 'font-bold cursor-pointer text-primary hover:underline'
    }, () => row.getValue('title'))
  },
  {
    accessorKey: 'department',
    header: t('plans.department'),
    cell: ({ row }: any) => (row.getValue('department') as any)?.name || '-'
  },
  {
    accessorKey: 'year',
    header: t('common.year')
  },
  {
    accessorKey: 'tasks',
    header: t('tasks.title'),
    cell: ({ row }: any) => h('div', { class: 'flex gap-1' }, [
        h(UBadge, { label: 'PRJ', color: 'neutral', variant: 'soft', size: 'sm' }),
        h(UBadge, { label: 'RTN', color: 'neutral', variant: 'soft', size: 'sm' })
    ])
  },
  {
    accessorKey: 'status',
    header: t('tasks.completion'),
    cell: () => h(UProgress, { value: Math.floor(Math.random() * 100), class: 'w-20' })
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }: any) => {
      const status = row.getValue('status') as string
      return h(UBadge, {
        label: status.replace('_', ' '),
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
])

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
    toast.add({ title: t('common.success'), color: 'success' })
    isDeleteModalOpen.value = false
  } catch (err) {
    toast.add({ title: t('common.error'), color: 'error' })
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
        <h1 class="text-3xl font-bold font-heading">{{ t('plans.title') }}</h1>
        <p class="text-neutral-500 font-medium">{{ t('plans.subtitle') }}</p>
      </div>
      <UButton v-if="canCreate" to="/plans/create" icon="i-heroicons-plus" color="primary" class="font-bold">
        {{ t('plans.new') }}
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
      <UTable :data="plans" :columns="columns" :loading="loading">
        <template #empty-state>
          <div class="flex flex-col items-center justify-center py-16 px-4 gap-4 text-center">
            <div class="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <UIcon name="i-heroicons-clipboard-document-list" class="text-3xl text-primary" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-neutral-900 dark:text-white">{{ t('plans.no_plans') }}</h3>
              <p class="text-sm text-neutral-500 mt-1 max-w-sm">
                {{ canCreate ? t('plans.no_plans_manager') : t('plans.no_plans_officer') }}
              </p>
            </div>
            <UButton v-if="canCreate" to="/plans/create" icon="i-heroicons-plus" color="primary">
              {{ t('plans.new') }}
            </UButton>
          </div>
        </template>
      </UTable>
    </UCard>

    <!-- Delete Confirmation -->
    <UModal v-model:open="isDeleteModalOpen" :title="t('plans.delete')">
      <template #content>
        <div class="p-6">
            <h3 class="text-xl font-bold mb-2">{{ t('plans.confirm_delete') }}</h3>
            <p class="text-neutral-500 mb-6 font-medium">{{ t('plans.delete_warning') }}</p>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">{{ t('common.cancel') }}</UButton>
              <UButton color="error" class="font-bold" @click="handleDelete">{{ t('common.delete') }}</UButton>
            </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
