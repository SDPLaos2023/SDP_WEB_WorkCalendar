<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { format } from 'date-fns'
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const { summary, loading: summaryLoading, fetchSummary, fetchProgress, fetchCompliance } = useDashboard()
const { progress } = useDashboard()
const { compliance } = useDashboard()

const currentFilters = ref({
  year: new Date().getFullYear(),
  companyId: '',
  departmentId: ''
})

async function fetchAllData(filters: any = currentFilters.value) {
    Object.assign(currentFilters.value, filters)
    await Promise.all([
        fetchSummary(currentFilters.value),
        fetchProgress(currentFilters.value),
        fetchCompliance(currentFilters.value)
    ])
}

onMounted(() => {
    fetchAllData()
})

const handleFilterChange = (newFilters: any) => {
    fetchAllData(newFilters)
}

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')

const kpis = computed(() => [
  { label: t('dashboard.total_plans'), value: summary.value?.totalPlans || 0, icon: 'i-heroicons-document-text' },
  { label: t('dashboard.active_plans'), value: summary.value?.activePlans || 0, icon: 'i-heroicons-play' },
  { label: t('dashboard.project_avg'), value: `${summary.value?.projectAvgCompletion || 0}%`, icon: 'i-heroicons-chart-bar' },
  { label: t('dashboard.compliance_avg'), value: `${summary.value?.routineComplianceAvg || 0}%`, icon: 'i-heroicons-check-circle' }
])

const projectColumns: TableColumn<any>[] = [
  {
    accessorKey: 'taskName',
    header: t('tasks.name')
  },
  {
    accessorKey: 'assignedTo',
    header: t('tasks.assign_to'),
    cell: ({ row }) => {
      const user = row.getValue('assignedTo') as any
      return `${user.firstName} ${user.lastName}`
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
      
      return h(UBadge, {
        label: t(`tasks.status_${status}`),
        color,
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'latestActual',
    header: t('tasks.completion'),
    cell: ({ row }) => {
      const latest = row.getValue('latestActual') as any
      const pct = latest?.completionPct || 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UProgress, { value: pct, class: 'w-24' }),
        h('span', { class: 'text-xs text-neutral-500' }, `${pct}%`)
      ])
    }
  }
]

const complianceColumns: TableColumn<any>[] = [
  {
    accessorKey: 'taskName',
    header: t('tasks.routine')
  },
  {
    accessorKey: 'compliancePct',
    header: t('tasks.compliance'),
    cell: ({ row }) => {
      const pct = row.getValue('compliancePct') as number
      const color = pct > 80 ? 'success' : pct > 50 ? 'warning' : 'error'
      return h(UBadge, { label: `${pct}%`, color, variant: 'solid' })
    }
  },
  {
    accessorKey: 'missedDates',
    header: t('tasks.missed_label'),
    cell: ({ row }) => {
      const dates = row.getValue('missedDates') as string[]
      if (!dates || dates.length === 0) {
        return h('span', { class: 'text-xs text-neutral-400 font-normal' }, 'Perfect attendance')
      }
      return h('div', { class: 'flex flex-wrap gap-1' }, [
        ...dates.slice(0, 2).map(date => h(UBadge, {
          label: format(new Date(date), 'MMM d'),
          color: 'error',
          variant: 'soft',
          size: 'sm'
        })),
        dates.length > 2 ? h('span', { class: 'text-xs text-neutral-500 my-auto' }, `+${dates.length - 2} more`) : null
      ])
    }
  }
]
const maxTrendValue = computed(() => {
  if (!summary.value?.trend?.length) return 10
  return Math.max(...summary.value.trend.map(d => d.count), 1)
})

const trendStartDate = computed(() => {
  const d = summary.value?.trend?.[0]?.date
  return d ? format(new Date(d), 'MMM d') : ''
})

const trendEndDate = computed(() => {
  const trend = summary.value?.trend
  const d = trend?.[trend.length - 1]?.date
  return d ? format(new Date(d), 'MMM d') : ''
})
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold font-heading">{{ t('dashboard.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400 font-medium">{{ t('dashboard.subtitle') }}</p>
      </div>
    </header>

    <ReportsReportFilter show-department @change="handleFilterChange" />

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="kpi in kpis" :key="kpi.label" class="flex flex-col justify-center min-h-[120px] relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-2 opacity-5 translate-x-1 translate-y-[-10%] group-hover:scale-110 transition-transform">
            <UIcon :name="kpi.icon" class="text-6xl text-primary" />
        </div>
        <div class="flex items-center gap-4 relative z-10">
          <div class="p-3 bg-primary-100/50 dark:bg-primary-950/30 rounded-2xl">
            <UIcon :name="kpi.icon" class="text-3xl text-primary" />
          </div>
          <div>
            <p class="text-xs text-neutral-500 uppercase font-bold tracking-wider">{{ kpi.label }}</p>
            <p class="text-2xl font-bold font-heading">{{ kpi.value }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Management Overview -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Status Breakdown -->
        <UCard class="lg:col-span-1">
            <template #header>
                <h3 class="font-bold font-heading flex items-center gap-2">
                    <UIcon name="i-heroicons-chart-pie" />
                    {{ t('dashboard.status_summary') }}
                </h3>
            </template>
            <div class="space-y-4">
                <div v-for="(count, status) in (summary?.statusBreakdown || {})" :key="status" class="space-y-1">
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-neutral-500">{{ t(`tasks.status_${(status as string).toLowerCase()}`) }}</span>
                        <span class="font-bold">{{ count }}</span>
                    </div>
                    <UProgress 
                        :value="count" 
                        :max="(summary?.totalTasks.project || 0) + (summary?.totalTasks.routine || 0)" 
                        :color="status === 'DONE' || status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'primary' : status === 'CANCELLED' ? 'error' : 'neutral'"
                        size="sm"
                    />
                </div>
            </div>
        </UCard>

        <!-- Top Departments -->
        <UCard class="lg:col-span-1">
            <template #header>
                <h3 class="font-bold font-heading flex items-center gap-2">
                    <UIcon name="i-heroicons-academic-cap" />
                    {{ t('dashboard.top_depts') }}
                </h3>
            </template>
            <div class="space-y-6">
                <div v-for="dept in summary?.topDepartments" :key="dept.name" class="flex items-center gap-4">
                    <div class="flex-1 space-y-1">
                        <p class="text-xs font-bold truncate">{{ dept.name }}</p>
                        <UProgress :value="dept.score" size="xs" :color="dept.score > 80 ? 'success' : dept.score > 50 ? 'warning' : 'primary'" />
                    </div>
                    <span class="text-sm font-bold w-10 text-right">{{ dept.score }}%</span>
                </div>
                <div v-if="!summary?.topDepartments?.length" class="text-center py-8 text-neutral-400 italic text-sm">
                    No department data available
                </div>
            </div>
        </UCard>

        <!-- Trend -->
        <UCard class="lg:col-span-1">
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="font-bold font-heading flex items-center gap-2">
                        <UIcon name="i-heroicons-bolt" />
                        {{ t('dashboard.trend') }}
                    </h3>
                    <UBadge variant="soft" color="primary" size="sm">{{ summary?.updatesToday || 0 }} today</UBadge>
                </div>
            </template>
            <div class="h-48 flex items-end justify-between gap-1 mt-4">
                <div 
                    v-for="day in summary?.trend" 
                    :key="day.date" 
                    class="flex-1 bg-primary/20 dark:bg-primary/10 rounded-t-sm relative group"
                    :style="{ height: `${Math.max((day.count / maxTrendValue) * 100, 5)}%` }"
                >
                    <div class="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-t-sm"></div>
                    <!-- Tooltip-like -->
                    <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                        {{ day.count }} updates on {{ summary ? format(new Date(day.date), 'MMM d') : '' }}
                    </div>
                </div>
            </div>
            <div class="flex justify-between mt-2 text-[8px] text-neutral-400 font-bold uppercase tracking-tighter">
                <span>{{ trendStartDate }}</span>
                <span>{{ trendEndDate }}</span>
            </div>
        </UCard>
    </div>

    <!-- Tables -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-4">
      <!-- Project Progress -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold font-heading flex items-center gap-2">
                <UIcon name="i-heroicons-rocket-launch" class="text-primary" />
                {{ t('dashboard.project_progress') }}
            </h3>
            <UButton to="/plans" variant="ghost" size="sm" icon="i-heroicons-arrow-right">{{ t('dashboard.view_all') }}</UButton>
          </div>
        </template>
        <UTable :data="progress" :columns="projectColumns" :loading="summaryLoading" />
      </UCard>

      <!-- Routine Compliance -->
      <UCard>
        <template #header>
          <h3 class="font-bold font-heading flex items-center gap-2">
              <UIcon name="i-heroicons-calendar" class="text-primary" />
              {{ t('dashboard.routine_compliance') }}
          </h3>
        </template>
        <UTable :data="compliance" :columns="complianceColumns" :loading="summaryLoading" />
      </UCard>
    </div>
  </div>
</template>
