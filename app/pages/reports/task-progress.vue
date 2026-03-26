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

const columns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'taskName',
    header: t('tasks.name')
  },
  {
    accessorKey: 'assignedTo',
    header: t('tasks.assign_to')
  },
  {
    accessorKey: 'priority',
    header: t('common.priority'),
    cell: ({ row }) => {
      const priority = (row.getValue('priority') as string)?.toLowerCase()
      let color = 'neutral'
      if (priority === 'critical' || priority === 'urgent') color = 'error'
      if (priority === 'high') color = 'warning'
      if (priority === 'medium') color = 'primary'

      return h(UBadge, { label: t(`common.priority_${priority}`), color, variant: 'solid', size: 'sm' })
    }
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }) => {
      const status = (row.getValue('status') as string)?.toLowerCase()
      let color = 'neutral'
      if (status === 'in_progress') color = 'primary'
      if (status === 'completed' || status === 'done') color = 'success'
      if (status === 'cancelled') color = 'error'

      return h(UBadge, { label: t(`tasks.status_${status}`), color, variant: 'subtle' })
    }
  },
  {
    accessorKey: 'timeline',
    header: t('common.date'),
    cell: ({ row }) => {
      const start = row.original.plannedStart
      const end = row.original.plannedEnd
      return h('span', { class: 'text-xs tabular-nums text-neutral-500' }, `${start} to ${end}`)
    }
  },
  {
    accessorKey: 'completionPct',
    header: t('tasks.completion'),
    cell: ({ row }) => {
      const val = row.getValue('completionPct') as string
      const pct = parseInt(val) || 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UProgress, { value: pct, class: 'w-16', size: 'sm' }),
        h('span', { class: 'text-xs text-neutral-500' }, val)
      ])
    }
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
        <h1 class="text-2xl font-bold font-heading">{{ t('reports.task_progress') }}</h1>
        <p class="text-neutral-500 dark:text-neutral-400 font-medium">{{ t('reports.task_progress_desc') }}</p>
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
            <UFormGroup :label="t('common.status')" class="w-40">
                <USelect
                    v-model="currentFilters.status"
                    :items="[
                        { label: t('tasks.status_pending'), value: 'PENDING' },
                        { label: t('tasks.status_in_progress'), value: 'IN_PROGRESS' },
                        { label: t('tasks.status_completed'), value: 'COMPLETED' },
                        { label: t('tasks.status_cancelled'), value: 'CANCELLED' }
                    ]"
                    label-key="label"
                    value-key="value"
                    :placeholder="t('common.all')"
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
