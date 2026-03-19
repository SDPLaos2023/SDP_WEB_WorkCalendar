<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { format } from 'date-fns'
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
  workPlanId: ''
})

const UBadge = resolveComponent('UBadge')

const fetchData = async () => {
  const result = await fetchReport('/api/reports/compliance-detail', currentFilters.value)
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
        '/api/reports/compliance-detail', 
        currentFilters.value, 
        `compliance-report-${currentFilters.value.year}.csv`
    )
}

onMounted(() => {
  fetchData()
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'taskName',
    header: 'Routine Task'
  },
  {
    accessorKey: 'assignedTo',
    header: 'Officer'
  },
  {
    accessorKey: 'recurrence',
    header: 'Recurrence',
    cell: ({ row }) => {
      const type = row.getValue('recurrence') as string
      return h(UBadge, { label: type, variant: 'subtle', color: 'primary', size: 'sm' })
    }
  },
  {
    accessorKey: 'compliancePct',
    header: 'Compliance',
    cell: ({ row }) => {
      const val = row.getValue('compliancePct') as string
      const pct = parseInt(val) || 0
      const color = pct > 80 ? 'success' : pct > 50 ? 'warning' : 'error'
      return h(UBadge, { label: val, color, variant: 'solid' })
    }
  },
  {
    accessorKey: 'expected',
    header: 'Exp/Act',
    cell: ({ row }) => {
      return `${row.original.completed} / ${row.original.expected}`
    }
  },
  {
    accessorKey: 'missedDates',
    header: 'Missed Dates',
    cell: ({ row }) => {
      const datesString = row.getValue('missedDates') as string
      if (datesString === '-') return h('span', { class: 'text-xs text-neutral-400 font-normal' }, 'Perfect')
      
      const dates = datesString.split(', ')
      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...dates.slice(0, 2).map(date => h(UBadge, {
          label: format(new Date(date), 'MMM d'),
          color: 'error',
          variant: 'soft',
          size: 'xs'
        })),
        dates.length > 2 ? h('span', { class: 'text-[10px] text-neutral-500 my-auto' }, `+${dates.length - 2} more`) : null
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
        <h1 class="text-2xl font-bold font-heading">Routine Compliance Report</h1>
        <p class="text-neutral-500 dark:text-neutral-400 font-medium">Monitoring adherence for recurring tasks in {{ currentFilters.year }}</p>
      </div>

      <ExportButtons 
        show-print 
        show-csv 
        :loading="loading"
        @csv="handleCSVExport"
      />
    </header>

    <ReportFilter show-department show-work-plan @change="handleFilterChange" />

    <UCard class="overflow-hidden shadow-sm">
        <UTable 
            :data="data" 
            :columns="columns" 
            :loading="loading" 
        >
            <template #empty-state>
                <div class="flex flex-col items-center justify-center py-10 gap-3">
                    <UIcon name="i-heroicons-check-badge" class="text-4xl text-neutral-300" />
                    <p class="text-neutral-400">No routine tasks found for this selection.</p>
                </div>
            </template>
        </UTable>
    </UCard>
    
    <div v-if="error" class="bg-error-50 dark:bg-error-900/10 border border-error-500/20 text-error-600 dark:text-error-400 p-4 rounded-xl text-sm font-medium">
        {{ error }}
    </div>
  </div>
</template>
