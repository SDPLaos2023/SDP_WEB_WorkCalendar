<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const { tasks, fetchMyTasks, loading } = usePlanTask()
const toast = useToast()

const tabs = computed(() => [
  { label: t('tasks.routine'), icon: 'i-heroicons-arrow-path', slot: 'routine' },
  { label: t('tasks.project'), icon: 'i-heroicons-briefcase', slot: 'projects' },
  { label: t('common.all'), icon: 'i-heroicons-list-bullet', slot: 'all' }
])

const UBadge = resolveComponent('UBadge')

const statusColors: Record<string, any> = {
  'PENDING': 'neutral',
  'IN_PROGRESS': 'primary',
  'DONE': 'success',
  'COMPLETED': 'success',
  'CANCELLED': 'error'
}

const priorityColors: Record<string, any> = {
  'LOW': 'info',
  'MEDIUM': 'primary',
  'HIGH': 'warning',
  'URGENT': 'error',
  'CRITICAL': 'error'
}

const columns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'taskName',
    header: t('tasks.name')
  },
  {
    accessorKey: 'workPlan.title',
    header: t('plans.title')
  },
  {
    accessorKey: 'priority',
    header: t('common.priority'),
    cell: ({ row }) => h(UBadge, { 
      label: t(`common.priority_${(row.getValue('priority') as string).toLowerCase()}`), 
      color: priorityColors[row.getValue('priority') as string] || 'neutral', 
      variant: 'soft' 
    })
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }) => h(UBadge, { 
      label: t(`tasks.status_${(row.getValue('status') as string).toLowerCase()}`), 
      color: statusColors[row.getValue('status') as string] || 'neutral' 
    })
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => h('div', { class: 'text-right' }, [
      h(resolveComponent('UButton'), {
        icon: 'i-heroicons-pencil-square',
        color: 'neutral',
        variant: 'ghost',
        to: `/tasks/${row.original.id}`
      })
    ])
  }
])

onMounted(() => {
  fetchMyTasks()
})

const routineTasks = computed(() => tasks.value.filter(t => t.taskType === 'ROUTINE'))
const projectTasks = computed(() => tasks.value.filter(t => t.taskType === 'PROJECT'))

const getTaskComplianceColor = (pct: number) => {
    if (pct >= 90) return 'success'
    if (pct >= 70) return 'warning'
    return 'error'
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-bold font-heading">{{ t('tasks.my_tasks') }}</h1>
        <p class="text-neutral-500 font-medium">{{ t('tasks.my_tasks_sub') }}</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" :loading="loading" @click="fetchMyTasks">{{ t('common.refresh') }}</UButton>
    </header>

    <div v-if="loading && tasks.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <USkeleton v-for="i in 4" :key="i" class="h-32 w-full" />
    </div>

    <div v-else-if="tasks.length === 0" class="py-20 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <UIcon name="i-heroicons-clipboard-document" class="w-12 h-12 text-neutral-300 mb-4" />
      <h3 class="text-lg font-bold text-neutral-900 dark:text-white">{{ t('tasks.no_tasks') }}</h3>
      <p class="text-neutral-500">{{ t('tasks.no_tasks_sub') }}</p>
    </div>

    <UTabs v-else :items="tabs" class="w-full">
      <template #routine>
        <div class="space-y-4 pt-4">
            <div v-if="routineTasks.length === 0" class="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div class="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="text-xl text-neutral-400" />
              </div>
              <p class="font-bold text-neutral-700 dark:text-neutral-300">{{ t('tasks.no_routine') }}</p>
              <p class="text-sm text-neutral-500">{{ t('tasks.no_tasks_sub') }}</p>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UCard v-for="task in routineTasks" :key="task.id" class="hover:border-primary transition-colors cursor-pointer group" @click="navigateTo(`/tasks/${task.id}`)">
                <div class="flex justify-between items-start">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <UBadge :label="task.priority" :color="priorityColors[task.priority] || 'neutral'" size="sm" variant="subtle" />
                            <span class="text-xs text-neutral-500">{{ task.workPlan?.title }}</span>
                        </div>
                        <h3 class="font-bold text-lg group-hover:text-primary leading-tight">{{ task.taskName }}</h3>
                        <div v-if="(task as any).compliance" class="flex items-center gap-2">
                             <div class="w-24 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div class="h-full" :class="`bg-${getTaskComplianceColor((task as any).compliance.compliancePct)}-500`" :style="`width: ${(task as any).compliance.compliancePct}%`" />
                             </div>
                             <span class="text-xs font-medium" :class="`text-${getTaskComplianceColor((task as any).compliance.compliancePct)}-600`">{{ (task as any).compliance.compliancePct }}% {{ t('tasks.compliance') }}</span>
                        </div>
                    </div>
                    <UButton icon="i-heroicons-pencil-square" color="primary" variant="soft" @click.stop="navigateTo(`/tasks/${task.id}`)">{{ t('tasks.report_progress') }}</UButton>
                </div>
                </UCard>
            </div>
        </div>
      </template>

      <template #projects>
        <div class="space-y-4 pt-4">
            <div v-if="projectTasks.length === 0" class="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div class="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <UIcon name="i-heroicons-briefcase" class="text-xl text-neutral-400" />
              </div>
              <p class="font-bold text-neutral-700 dark:text-neutral-300">{{ t('tasks.no_project') }}</p>
              <p class="text-sm text-neutral-500">{{ t('tasks.no_tasks_sub') }}</p>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UCard v-for="task in projectTasks" :key="task.id" class="hover:border-primary transition-colors cursor-pointer group" @click="navigateTo(`/tasks/${task.id}`)">
                <div class="flex justify-between items-start">
                    <div class="space-y-2">
                         <div class="flex items-center gap-2">
                             <UBadge :label="t(`tasks.status_${task.status.toLowerCase()}`)" :color="statusColors[task.status] || 'neutral'" size="sm" />
                            <span class="text-xs text-neutral-500">{{ task.workPlan?.title }}</span>
                        </div>
                        <h3 class="font-bold text-lg group-hover:text-primary leading-tight">{{ task.taskName }}</h3>
                        <div class="text-xs text-neutral-500 flex items-center gap-1">
                            <UIcon name="i-heroicons-calendar" />
                            {{ formatDate(task.plannedStart) }} - {{ formatDate(task.plannedEnd) }}
                        </div>
                    </div>
                    <UButton icon="i-heroicons-bolt" color="primary" variant="soft" @click.stop="navigateTo(`/tasks/${task.id}`)">{{ t('tasks.update_progress') }}</UButton>
                </div>
                </UCard>
            </div>
        </div>
      </template>

      <template #all>
        <div class="pt-4">
            <UCard class="p-0">
                <UTable :data="tasks" :columns="columns" />
            </UCard>
        </div>
      </template>
    </UTabs>
  </div>
</template>
