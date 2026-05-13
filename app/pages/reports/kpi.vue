<script setup lang="ts">
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

type KpiPeriod = 'MONTHLY' | 'YEARLY'

type KpiTask = {
  id: string
  name: string
  type: string
  actual: number
  status: string
  actualCount: number
}

type KpiPlan = {
  id: string
  planName: string
  department: string
  year: number
  status: string
  totalTasks: number
  completedUnits: number
  targetUnits: number
  unitLabel: 'days' | 'months'
  period: KpiPeriod
  achievementPct: number
  kpiPct: number
  tasks: KpiTask[]
}

const { t } = useI18n()
const { fetchReport, loading, error } = useReport()
const { apiFetch, role } = useAuth()

const reportData = ref<KpiPlan[]>([])
const expandedRows = ref<Record<string, boolean>>({})
const departments = ref<Array<{ label: string, value: string }>>([])
const workPlans = ref<Array<{ label: string, value: string }>>([])

const filters = reactive({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  departmentId: '',
  workPlanId: '',
  period: 'MONTHLY' as KpiPeriod
})

const periodItems = computed(() => [
  { label: t('reports.period_monthly'), value: 'MONTHLY' },
  { label: t('reports.period_yearly'), value: 'YEARLY' }
])

const monthItems = computed(() => [
  { label: t('common.months.jan'), value: 1 },
  { label: t('common.months.feb'), value: 2 },
  { label: t('common.months.mar'), value: 3 },
  { label: t('common.months.apr'), value: 4 },
  { label: t('common.months.may'), value: 5 },
  { label: t('common.months.jun'), value: 6 },
  { label: t('common.months.jul'), value: 7 },
  { label: t('common.months.aug'), value: 8 },
  { label: t('common.months.sep'), value: 9 },
  { label: t('common.months.oct'), value: 10 },
  { label: t('common.months.nov'), value: 11 },
  { label: t('common.months.dec'), value: 12 }
])

const years = Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index)

const ruleText = computed(() => (
  filters.period === 'MONTHLY'
    ? 'เกณฑ์รายเดือน: จำนวนวันที่มีรายงานในแผนงาน / 30 x 100'
    : 'เกณฑ์รายปี: จำนวนเดือนที่มีรายงานในแผนงาน / 12 x 100'
))

const targetLabel = computed(() => (
  filters.period === 'MONTHLY' ? '30 วัน' : '12 เดือน'
))

const unitText = (row: KpiPlan) => row.unitLabel === 'days' ? t('reports.days') : t('reports.months_unit')

const kpiColor = (value: number) => {
  if (value >= 90) return 'success'
  if (value >= 70) return 'warning'
  return 'error'
}

const statusColor = (status: string) => {
  if (status === 'ACTIVE') return 'primary'
  if (status === 'CLOSED') return 'error'
  return 'neutral'
}

const fetchDepartments = async () => {
  if (role.value !== 'SUPER_ADMIN' && role.value !== 'ADMIN_COMPANY') return

  try {
    const response = await apiFetch<{ success: boolean, data: Array<{ id: string, name: string }> }>('/api/departments', {
      params: { limit: 100 }
    })

    if (response.success) {
      departments.value = response.data.map(department => ({
        label: department.name,
        value: department.id
      }))
    }
  } catch (fetchError) {
    console.error('[KPI_DEPARTMENTS_ERROR]:', fetchError)
  }
}

const fetchWorkPlans = async () => {
  try {
    const response = await apiFetch<{ success: boolean, data: Array<{ id: string, title: string, name?: string }> }>('/api/work-plans', {
      params: {
        year: filters.year,
        departmentId: filters.departmentId || undefined,
        limit: 100
      }
    })

    if (response.success) {
      workPlans.value = response.data.map(plan => ({
        label: plan.name || plan.title,
        value: plan.id
      }))
    }
  } catch (fetchError) {
    console.error('[KPI_WORK_PLANS_ERROR]:', fetchError)
  }
}

const fetchData = async () => {
  const result = await fetchReport('/api/reports/kpi', {
    year: filters.year,
    month: filters.month,
    departmentId: filters.departmentId,
    workPlanId: filters.workPlanId,
    period: filters.period
  })

  reportData.value = Array.isArray(result) ? result : []
  expandedRows.value = {}
}

function toggleRow(id: string) {
  expandedRows.value[id] = !expandedRows.value[id]
}

watch([() => filters.year, () => filters.departmentId], () => {
  filters.workPlanId = ''
  fetchWorkPlans()
})

watch(
  [() => filters.year, () => filters.month, () => filters.departmentId, () => filters.workPlanId, () => filters.period],
  () => fetchData(),
  { immediate: true }
)

onMounted(() => {
  fetchDepartments()
  fetchWorkPlans()
})
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
        <h1 class="text-3xl font-bold font-heading">{{ t('reports.kpi') }}</h1>
        <p class="text-neutral-500 font-normal">{{ t('reports.kpi_desc') }}</p>
      </div>

      <ExportButtons show-print :loading="loading" />
    </header>

    <div class="flex flex-wrap gap-4 items-end bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm print:hidden">
      <div class="w-32 space-y-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ t('common.year') }}</label>
        <USelect v-model="filters.year" :items="years" />
      </div>

      <div class="w-40 space-y-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ t('reports.evaluation_period') }}</label>
        <USelect v-model="filters.period" :items="periodItems" />
      </div>

      <div v-if="filters.period === 'MONTHLY'" class="w-44 space-y-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ t('common.month') }}</label>
        <USelect v-model="filters.month" :items="monthItems" />
      </div>

      <div v-if="role === 'SUPER_ADMIN' || role === 'ADMIN_COMPANY'" class="w-64 space-y-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ t('management.department') }}</label>
        <USelect
          v-model="filters.departmentId"
          :items="departments"
          :placeholder="t('common.all')"
        />
      </div>

      <div class="w-72 space-y-1">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-200">{{ t('reports.work_plan') }}</label>
        <USelect
          v-model="filters.workPlanId"
          :items="workPlans"
          :placeholder="t('common.all')"
        />
      </div>

      <UButton
        icon="i-heroicons-arrow-path"
        variant="soft"
        :loading="loading"
        @click="fetchData"
      >
        {{ t('common.refresh') }}
      </UButton>
    </div>

    <UCard class="p-0 overflow-hidden shadow-sm border-neutral-200 dark:border-neutral-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              <th class="w-12 p-4"></th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('plans.title') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('management.department') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('common.status') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('tasks.title') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('reports.achieved_target') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('reports.kpi_score') }}</th>
              <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('reports.average_performance') }}</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <template v-for="item in reportData" :key="item.id">
              <tr
                class="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-colors"
                @click="toggleRow(item.id)"
              >
                <td class="p-4 text-center">
                  <UIcon
                    :name="expandedRows[item.id] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                    class="text-neutral-400 group-hover:text-primary transition-colors"
                  />
                </td>
                <td class="p-4 font-bold text-neutral-900 dark:text-white">{{ item.planName }}</td>
                <td class="p-4 text-neutral-500 text-sm">{{ item.department }}</td>
                <td class="p-4">
                  <UBadge :label="item.status" :color="statusColor(item.status)" variant="subtle" />
                </td>
                <td class="p-4 text-neutral-700 dark:text-neutral-300">{{ item.totalTasks }}</td>
                <td class="p-4 text-neutral-700 dark:text-neutral-300">
                  {{ item.completedUnits }} / {{ item.targetUnits }} {{ unitText(item) }}
                </td>
                <td class="p-4">
                  <div class="flex items-center gap-3 w-48">
                    <UProgress
                      :value="item.kpiPct"
                      size="sm"
                      :color="kpiColor(item.kpiPct)"
                      class="flex-1"
                    />
                    <span
                      class="font-bold text-sm w-12 text-right"
                      :class="item.kpiPct >= 90 ? 'text-success-600' : item.kpiPct >= 70 ? 'text-warning-600' : 'text-error-600'"
                    >
                      {{ item.kpiPct }}%
                    </span>
                  </div>
                </td>
                <td class="p-4 font-semibold text-neutral-700 dark:text-neutral-300">{{ item.achievementPct }}%</td>
              </tr>

              <tr v-if="expandedRows[item.id]">
                <td colspan="8" class="p-0 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <div class="p-6 border-l-4 border-primary ml-12 mb-4 mt-2">
                    <h4 class="text-sm font-bold mb-4 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                      <UIcon name="i-heroicons-clipboard-document-list" class="text-primary" />
                      {{ t('reports.tasks_in_plan') }} {{ item.planName }}
                    </h4>

                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div
                        v-for="task in item.tasks"
                        :key="task.id"
                        class="p-4 bg-white dark:bg-gray-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm"
                      >
                        <div class="flex justify-between items-start gap-3 mb-3">
                          <div class="flex flex-col gap-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <UBadge :label="t('tasks.' + task.type.toLowerCase())" size="xs" color="neutral" variant="subtle" />
                              <UBadge
                                :label="t(`tasks.status_${task.status.toLowerCase()}`)"
                                size="xs"
                                :color="task.status === 'DONE' ? 'success' : 'neutral'"
                                variant="soft"
                              />
                            </div>
                            <span class="font-bold text-sm text-neutral-900 dark:text-white truncate">{{ task.name }}</span>
                          </div>
                          <div class="text-right shrink-0">
                            <div class="text-[10px] uppercase font-bold text-neutral-400 mb-1">{{ t('reports.achievement') }}</div>
                            <span class="font-black text-lg" :class="task.actual >= 80 ? 'text-success-500' : 'text-warning-500'">
                              {{ task.actual }}%
                            </span>
                          </div>
                        </div>

                        <div class="flex items-center gap-2 text-[11px] text-neutral-500 mb-3 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg">
                          <UIcon name="i-heroicons-document-check" />
                          <span>{{ t('reports.logged_in_period', { count: task.actualCount }) }}</span>
                        </div>
                        <UProgress :value="task.actual" size="xs" :color="task.actual >= 80 ? 'success' : 'warning'" />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-if="reportData.length === 0 && !loading">
              <td colspan="8" class="p-12 text-center text-neutral-400">
                <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl mb-2 mx-auto" />
                <p>{{ t('common.none') }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <div v-if="error" class="bg-error-50 p-4 border border-error-200 rounded-xl text-error-600 text-sm">
      {{ error }}
    </div>
  </div>
</template>
