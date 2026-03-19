<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const { tasks, fetchMyTasks, loading } = usePlanTask()
const toast = useToast()

const tabs = [
  { label: 'Routine', icon: 'i-heroicons-arrow-path', slot: 'routine' },
  { label: 'Projects', icon: 'i-heroicons-briefcase', slot: 'projects' },
  { label: 'All Tasks', icon: 'i-heroicons-list-bullet', slot: 'all' }
]

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

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'taskName',
    header: 'Task Name'
  },
  {
    accessorKey: 'workPlan.title',
    header: 'Work Plan'
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => h(UBadge, { 
      label: row.getValue('priority'), 
      color: priorityColors[row.getValue('priority') as string] || 'neutral', 
      variant: 'soft' 
    })
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, { 
      label: row.getValue('status'), 
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
]

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
        <h1 class="text-3xl font-bold font-heading">My Assignments</h1>
        <p class="text-neutral-500 font-medium">Tracking tasks assigned to {{ user?.firstName }} {{ user?.lastName }}</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" :loading="loading" @click="fetchMyTasks">Refresh</UButton>
    </header>

    <div v-if="loading && tasks.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <USkeleton v-for="i in 4" :key="i" class="h-32 w-full" />
    </div>

    <div v-else-if="tasks.length === 0" class="py-20 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <UIcon name="i-heroicons-clipboard-document" class="w-12 h-12 text-neutral-300 mb-4" />
      <h3 class="text-lg font-bold text-neutral-900 dark:text-white">No tasks assigned yet</h3>
      <p class="text-neutral-500">When your supervisor assigns you a task, it will appear here.</p>
    </div>

    <UTabs v-else :items="tabs" class="w-full">
      <template #routine>
        <div class="space-y-4 pt-4">
            <div v-if="routineTasks.length === 0" class="text-neutral-500 py-10 text-center">No routine tasks found.</div>
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
                             <span class="text-xs font-medium" :class="`text-${getTaskComplianceColor((task as any).compliance.compliancePct)}-600`">{{ (task as any).compliance.compliancePct }}% Compliance</span>
                        </div>
                    </div>
                    <UButton icon="i-heroicons-pencil-square" color="primary" variant="soft" @click.stop="navigateTo(`/tasks/${task.id}`)">Report</UButton>
                </div>
                </UCard>
            </div>
        </div>
      </template>

      <template #projects>
        <div class="space-y-4 pt-4">
            <div v-if="projectTasks.length === 0" class="text-neutral-500 py-10 text-center">No project tasks found.</div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UCard v-for="task in projectTasks" :key="task.id" class="hover:border-primary transition-colors cursor-pointer group" @click="navigateTo(`/tasks/${task.id}`)">
                <div class="flex justify-between items-start">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <UBadge :label="task.status" :color="statusColors[task.status] || 'neutral'" size="sm" />
                            <span class="text-xs text-neutral-500">{{ task.workPlan?.title }}</span>
                        </div>
                        <h3 class="font-bold text-lg group-hover:text-primary leading-tight">{{ task.taskName }}</h3>
                        <div class="text-xs text-neutral-500 flex items-center gap-1">
                            <UIcon name="i-heroicons-calendar" />
                            {{ task.plannedStart ? new Date(task.plannedStart).toLocaleDateString() : '?' }} - {{ task.plannedEnd ? new Date(task.plannedEnd).toLocaleDateString() : '?' }}
                        </div>
                    </div>
                    <UButton icon="i-heroicons-bolt" color="primary" variant="soft" @click.stop="navigateTo(`/tasks/${task.id}`)">Update</UButton>
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
