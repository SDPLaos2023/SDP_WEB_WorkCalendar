<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const { fetchReport, loading, error } = useReport()

const activeTabIndex = ref(0)
const tabs = computed(() => [
  { label: t('reports.officer_performance'), slot: 'OFFICER', icon: 'i-heroicons-user' },
  { label: t('reports.officer_performance_desc'), slot: 'SUPERVISOR', icon: 'i-heroicons-user-group' } // just a fallback for supervisor kpi string
])

const filters = reactive({
  year: new Date().getFullYear(),
  departmentId: '',
  type: 'OFFICER'
})

const reportData = ref<any[]>([])

const fetchData = async () => {
    loading.value = true
    try {
        const type = tabs.value[activeTabIndex.value]?.slot || 'OFFICER'
        const result = await fetchReport('/api/reports/kpi', {
            year: filters.year,
            departmentId: filters.departmentId,
            type
        })
        if (result) {
            reportData.value = result
        }
    } catch (e: any) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

watch([() => filters.year, () => filters.departmentId, activeTabIndex], () => {
    fetchData()
}, { immediate: true })

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')

const renderKPICell = ({ row }: any) => {
  const val = row.getValue('kpiPct') as number
  const color = val >= 90 ? 'success' : val >= 70 ? 'warning' : 'error'
  return h('div', { class: 'flex items-center gap-3 w-48' }, [
    h(UProgress, { value: val, color, class: 'flex-1' }),
    h('span', { class: `font-bold text-sm text-${color}-600 dark:text-${color}-400` }, `${val}%`)
  ])
}

const expandedRows = ref<Record<string, boolean>>({})

function toggleRow(id: string) {
    expandedRows.value[id] = !expandedRows.value[id]
}

const columns = computed(() => {
    const currentTab = tabs.value[activeTabIndex.value]?.slot || 'OFFICER'
    const expandCol = { id: 'expand', header: '' }

    if (currentTab === 'SUPERVISOR') {
        return [
            expandCol,
            { accessorKey: 'name', header: 'Supervisor Name' },
            { accessorKey: 'department', header: 'Department' },
            { accessorKey: 'totalPlans', header: 'Plans' },
            { accessorKey: 'totalTasks', header: 'Tasks' },
            { accessorKey: 'kpiPct', header: 'Overall KPI', cell: renderKPICell }
        ]
    }
    return [
       expandCol,
       { accessorKey: 'name', header: 'Officer Name' },
       { accessorKey: 'department', header: 'Department' },
       { accessorKey: 'totalTasks', header: 'Assigned Tasks' },
       { accessorKey: 'kpiPct', header: 'Performance KPI', cell: renderKPICell }
    ]
})

function handleFilterChange(newFilters: any) {
    if (newFilters.year) filters.year = newFilters.year
    if (newFilters.departmentId !== undefined) filters.departmentId = newFilters.departmentId
}
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
        <p class="text-neutral-500 font-medium">{{ t('reports.kpi_desc') }}</p>
      </div>

      <ExportButtons show-print :loading="loading" />
    </header>

    <ReportFilter show-department @change="handleFilterChange" />

    <UTabs v-model="activeTabIndex" :items="tabs" class="w-full">
      <template #OFFICER>
        <div class="pt-4">
            <UCard class="p-0 overflow-hidden shadow-sm border-neutral-200 dark:border-neutral-800">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                                <th class="w-12 p-4"></th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('common.name') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('management.department') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('tasks.title') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('reports.kpi') }}</th>
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
                                    <td class="p-4 font-bold text-neutral-900 dark:text-white">{{ item.name }}</td>
                                    <td class="p-4 text-neutral-500 text-sm">{{ item.department }}</td>
                                    <td class="p-4 text-neutral-700 dark:text-neutral-300 font-medium">{{ item.totalTasks }}</td>
                                    <td class="p-4">
                                        <div class="flex items-center gap-3 w-48">
                                            <UProgress
                                                :value="item.kpiPct"
                                                size="sm"
                                                :color="item.kpiPct >= 90 ? 'success' : item.kpiPct >= 70 ? 'warning' : 'error'"
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
                                </tr>
                                <tr v-if="expandedRows[item.id]">
                                    <td colspan="5" class="p-0 bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <div class="p-6 border-l-4 border-primary ml-12 mb-4 mt-2">
                                            <h4 class="text-sm font-bold mb-4 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                                <UIcon name="i-heroicons-clipboard-document-list" class="text-primary" />
                                                {{ t('tasks.name') }} ({{ item.name }})
                                            </h4>
                                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                <div v-for="task in item.tasks" :key="task.id" class="p-4 bg-white dark:bg-gray-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                                                    <div class="flex justify-between items-start mb-3">
                                                        <div class="flex flex-col gap-1">
                                                            <div class="flex items-center gap-2">
                                                                <UBadge :label="task.type" size="xs" color="neutral" variant="subtle" />
                                                                <UBadge :label="task.status" size="xs" :color="task.status === 'DONE' ? 'success' : 'neutral'" variant="soft" />
                                                            </div>
                                                            <span class="font-bold text-sm text-neutral-900 dark:text-white">{{ task.name }}</span>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-[10px] uppercase font-bold text-neutral-400 mb-1">Achievement</div>
                                                            <span class="font-black text-lg" :class="task.actual >= 80 ? 'text-success-500' : 'text-warning-500'">{{ task.actual }}%</span>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-2 text-[11px] text-neutral-500 mb-3 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg">
                                                        <UIcon name="i-heroicons-calendar" />
                                                        <span class="truncate">{{ task.planTitle }}</span>
                                                    </div>
                                                    <UProgress :value="task.actual" size="xs" :color="task.actual >= 80 ? 'success' : 'warning'" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                            <tr v-if="reportData.length === 0 && !loading">
                                <td colspan="5" class="p-12 text-center text-neutral-400">
                                    <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl mb-2 mx-auto" />
                                    <p>{{ t('common.none') }}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>
        </div>
      </template>
      <template #SUPERVISOR>
        <div class="pt-4">
             <UCard class="p-0 overflow-hidden shadow-sm border-neutral-200 dark:border-neutral-800">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                                <th class="w-12 p-4"></th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('common.name') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('management.department') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('plans.title') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('tasks.title') }}</th>
                                <th class="p-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{{ t('reports.kpi') }}</th>
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
                                    <td class="p-4 font-bold text-neutral-900 dark:text-white">{{ item.name }}</td>
                                    <td class="p-4 text-neutral-500 text-sm">{{ item.department }}</td>
                                    <td class="p-4 text-neutral-700 dark:text-neutral-300 font-medium">{{ item.totalPlans }}</td>
                                    <td class="p-4 text-neutral-700 dark:text-neutral-300 font-medium">{{ item.totalTasks }}</td>
                                    <td class="p-4">
                                        <div class="flex items-center gap-3 w-48">
                                            <UProgress
                                                :value="item.kpiPct"
                                                size="sm"
                                                :color="item.kpiPct >= 90 ? 'success' : item.kpiPct >= 70 ? 'warning' : 'error'"
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
                                </tr>
                                <tr v-if="expandedRows[item.id]">
                                    <td colspan="6" class="p-0 bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <div class="p-6 border-l-4 border-primary ml-12 mb-4 mt-2">
                                            <h4 class="text-sm font-bold mb-4 flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                                                <UIcon name="i-heroicons-clipboard-document-list" class="text-primary" />
                                                {{ t('tasks.name') }} ({{ item.name }})
                                            </h4>
                                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                <div v-for="task in item.tasks" :key="task.id" class="p-4 bg-white dark:bg-gray-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow">
                                                    <div class="flex justify-between items-start mb-3">
                                                        <div class="flex flex-col gap-1">
                                                            <div class="flex items-center gap-2">
                                                                <UBadge :label="task.type" size="xs" color="neutral" variant="subtle" />
                                                                <UBadge :label="task.status" size="xs" :color="task.status === 'DONE' ? 'success' : 'neutral'" variant="soft" />
                                                            </div>
                                                            <span class="font-bold text-sm text-neutral-900 dark:text-white">{{ task.name }}</span>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="text-[10px] uppercase font-bold text-neutral-400 mb-1">Achievement</div>
                                                            <span class="font-black text-lg" :class="task.actual >= 80 ? 'text-success-500' : 'text-warning-500'">{{ task.actual }}%</span>
                                                        </div>
                                                    </div>
                                                    <div class="flex items-center gap-2 text-[11px] text-neutral-500 mb-3 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg">
                                                        <UIcon name="i-heroicons-calendar" />
                                                        <span class="truncate">{{ task.planTitle }}</span>
                                                    </div>
                                                    <UProgress :value="task.actual" size="xs" :color="task.actual >= 80 ? 'success' : 'warning'" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </template>
                            <tr v-if="reportData.length === 0 && !loading">
                                <td colspan="6" class="p-12 text-center text-neutral-400">
                                    <UIcon name="i-heroicons-document-magnifying-glass" class="text-4xl mb-2 mx-auto" />
                                    <p>{{ t('common.none') }}</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </UCard>
        </div>
      </template>
    </UTabs>

    <div v-if="error" class="bg-error-50 p-4 border border-error-200 rounded-xl text-error-600 text-sm">
        {{ error }}
    </div>
  </div>
</template>
