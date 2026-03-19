<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const { fetchReport, downloadCSV, loading, error } = useReport()
const data = ref<any[]>([])
const currentFilters = ref({
  year: new Date().getFullYear(),
  departmentId: '',
  workPlanId: '',
  status: ''
})

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')

const fetchData = async () => {
  const result = await fetchReport('/api/reports/task-progress', currentFilters.value)
  if (result) {
    data.value = result
  }
}

const handleFilterChange = (newFilters: any) => {
  Object.assign(currentFilters.value, newFilters)
  fetchData()
}

const handleCSVExport = () => {
    downloadCSV(
        '/api/reports/task-progress', 
        currentFilters.value, 
        `task-progress-${currentFilters.value.year}.csv`
    )
}

onMounted(() => {
  fetchData()
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'taskName',
    header: 'Task Name'
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To'
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string
      let color = 'neutral'
      if (priority === 'CRITICAL') color = 'error'
      if (priority === 'HIGH') color = 'warning'
      
      return h(UBadge, { label: priority, color, variant: 'solid', size: 'sm' })
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      let color = 'primary'
      if (status === 'COMPLETED' || status === 'DONE') color = 'success'
      
      return h(UBadge, { label: status, color, variant: 'subtle' })
    }
  },
  {
    accessorKey: 'timeline',
    header: 'Timeline',
    cell: ({ row }) => {
      const start = row.original.plannedStart
      const end = row.original.plannedEnd
      return h('span', { class: 'text-xs tabular-nums text-neutral-500' }, `${start} to ${end}`)
    }
  },
  {
    accessorKey: 'completionPct',
    header: 'Completion',
    cell: ({ row }) => {
      const val = row.getValue('completionPct') as string
      const pct = parseInt(val) || 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UProgress, { value: pct, class: 'w-16', size: 'sm' }),
        h('span', { class: 'text-xs text-neutral-500' }, val)
      ])
    }
  }
]
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-1">
        <UButton
          to="/reports"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          class="-ml-2 mb-2 print:hidden"
        >
          Back to Hub
        </UButton>
        <h1 class="text-2xl font-bold font-heading">Task Progress Report</h1>
        <p class="text-neutral-500 dark:text-neutral-400 font-medium">Tracking all PROJECT tasks and current milestones</p>
      </div>

      <ExportButtons 
        show-print 
        show-csv 
        :loading="loading"
        @csv="handleCSVExport"
      />
    </header>

    <ReportFilter show-department show-work-plan @change="handleFilterChange">
        <template #extra>
            <UFormGroup label="Status" class="w-40">
                <USelect 
                    v-model="currentFilters.status" 
                    :items="['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']" 
                    placeholder="All Statuses"
                    @change="fetchData"
                />
            </UFormGroup>
        </template>
    </ReportFilter>

    <UCard class="overflow-hidden shadow-sm">
        <UTable 
            :data="data" 
            :columns="columns" 
            :loading="loading" 
        >
            <template #empty-state>
                <div class="flex flex-col items-center justify-center py-10 gap-3">
                    <UIcon name="i-heroicons-clipboard-document-list" class="text-4xl text-neutral-300" />
                    <p class="text-neutral-400">No project tasks found for the selected criteria.</p>
                </div>
            </template>
        </UTable>
    </UCard>
    
    <div v-if="error" class="bg-error-50 dark:bg-error-900/10 border border-error-500/20 text-error-600 dark:text-error-400 p-4 rounded-xl text-sm font-medium">
        {{ error }}
    </div>
  </div>
</template>
