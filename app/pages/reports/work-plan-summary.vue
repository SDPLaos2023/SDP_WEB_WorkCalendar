<script setup lang="ts">
const { t } = useI18n()
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
  workPlanId: ''
})

const UBadge = resolveComponent('UBadge')

const fetchData = async () => {
  const result = await fetchReport('/api/reports/work-plan-summary', currentFilters.value)
  if (result) {
    data.value = result
  }
}

const handleFilterChange = (newFilters: any) => {
  currentFilters.value = newFilters
  fetchData()
}

const handleCSVExport = () => {
    downloadCSV(
        '/api/reports/work-plan-summary', 
        currentFilters.value, 
        `work-plan-summary-${currentFilters.value.year}.csv`
    )
}

onMounted(() => {
  fetchData()
})

const columns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'planName',
    header: t('plans.title')
  },
  {
    accessorKey: 'department',
    header: t('plans.department')
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      let color = 'neutral'
      if (status === 'ACTIVE') color = 'primary'
      if (status === 'CLOSED') color = 'error'
      
      return h(UBadge, { label: status, color, variant: 'subtle' })
    }
  },
  {
    accessorKey: 'totalTasks',
    header: t('tasks.title')
  },
  {
    accessorKey: 'projectAvgCompletion',
    header: t('tasks.completion') + ' (%)'
  },
  {
    accessorKey: 'routineComplianceAvg',
    header: t('tasks.compliance') + ' (%)'
  }
])
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
          {{ t('common.back') }}
        </UButton>
        <h1 class="text-2xl font-bold font-heading">{{ t('reports.work_plan_summary') }}</h1>
        <p class="text-neutral-500 dark:text-neutral-400 font-medium">{{ t('reports.work_plan_summary_desc') }}</p>
      </div>

      <ExportButtons 
        show-print 
        show-csv 
        :loading="loading"
        @csv="handleCSVExport"
      />
    </header>

    <ReportFilter show-department @change="handleFilterChange" />

    <UCard class="overflow-hidden shadow-sm">
        <UTable 
            :data="data" 
            :columns="columns" 
            :loading="loading" 
        >
            <template #empty-state>
                <div class="flex flex-col items-center justify-center py-10 gap-3">
                    <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl text-neutral-300" />
                    <p class="text-neutral-400">{{ t('common.none') }}</p>
                </div>
            </template>
        </UTable>
    </UCard>
    
    <div v-if="error" class="bg-error-50 dark:bg-error-900/10 border border-error-500/20 text-error-600 dark:text-error-400 p-4 rounded-xl text-sm font-medium">
        {{ error }}
    </div>
  </div>
</template>
