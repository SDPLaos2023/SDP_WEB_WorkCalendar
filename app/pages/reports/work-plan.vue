<script setup lang="ts">
import WorkPlanGrid from '~/components/report/WorkPlanGrid.vue'
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const { fetchReport, downloadCSV, downloadBinary, loading, error } = useReport()
const reportData = ref<any>(null)
const summaryData = ref<any[]>([])
const currentFilters = ref({
  year: new Date().getFullYear(),
  departmentId: '',
  status: '',
  assignedTo: ''
})

const fetchData = async () => {
    const [grid, summary] = await Promise.all([
        fetchReport('/api/reports/work-plan-grid', currentFilters.value),
        fetchReport('/api/reports/work-plan-summary-stats', currentFilters.value)
    ])
    if (grid) reportData.value = grid
    if (summary) summaryData.value = summary
}

const handleFilterChange = (newFilters: any) => {
    Object.assign(currentFilters.value, newFilters)
    fetchData()
}

onMounted(() => {
    fetchData()
})

const handlePrint = () => {
    window.print()
}

const handleExcelExport = () => {
    downloadBinary(
        '/api/reports/work-plan-export',
        currentFilters.value,
        `work-plan-${currentFilters.value.year}.xlsx`
    )
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
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
        <h1 class="text-2xl font-bold font-heading">
            {{ reportData?.meta?.title || `${currentFilters.year} Work Plan Report` }}
        </h1>
        <div class="flex items-center gap-4 text-sm text-neutral-500 font-medium">
            <span v-if="reportData?.meta?.date">Date: {{ reportData.meta.date }}</span>
            <span class="print:hidden">|</span>
            <p class="print:hidden">Status: {{ currentFilters.status || 'All' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3 print:hidden">
        <UButton
          icon="i-heroicons-printer"
          label="Print / PDF"
          color="neutral"
          variant="outline"
          @click="handlePrint"
        />
        <UButton
          icon="i-heroicons-document-arrow-down"
          label="Export Excel"
          color="primary"
          :loading="loading"
          @click="handleExcelExport"
        />
      </div>
    </header>

    <!-- Filters -->
    <ReportFilter 
        class="print:hidden"
        show-department 
        show-assigned-to 
        @change="handleFilterChange" 
    />

    <!-- Summary Stats (Top Bar) -->
    <div v-if="summaryData.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <UCard v-for="stat in summaryData" :key="stat.section" class="bg-primary-50/20 dark:bg-primary-900/5 shadow-none border-neutral-200 dark:border-neutral-800">
            <div class="space-y-1">
                <p class="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{{ stat.section }}</p>
                <div class="flex items-end justify-between">
                    <div>
                        <p class="text-xl font-bold text-primary-600">{{ stat.overallProgressPct }}</p>
                        <p v-if="stat.compliancePct !== '0%' && stat.progressPct !== '0%'" class="text-[9px] text-neutral-400">
                           Proj: {{ stat.progressPct }} | Comp: {{ stat.compliancePct }}
                        </p>
                    </div>
                    <p class="text-xs text-neutral-400">{{ stat.actualDone }} / {{ stat.planned }} units</p>
                </div>
            </div>
        </UCard>
    </div>

    <!-- Main Grid -->
    <div v-if="loading" class="space-y-4">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-[400px] w-full" />
    </div>
    
    <WorkPlanGrid v-else-if="reportData" :data="reportData" />

    <div v-if="error" class="bg-error-50 dark:bg-error-900/10 border border-error-500/20 text-error-600 dark:text-error-400 p-4 rounded-xl text-sm font-medium">
        {{ error }}
    </div>

    <!-- Print Footer -->
    <div class="hidden print:block mt-12 pt-8 border-t border-neutral-200">
        <div class="grid grid-cols-3 gap-8 text-center text-sm font-medium">
            <div class="space-y-12">
                <p>Prepared by</p>
                <div class="h-px bg-neutral-300 w-48 mx-auto"></div>
                <p>(................................................)</p>
            </div>
            <div class="space-y-12">
                <p>Checked by</p>
                <div class="h-px bg-neutral-300 w-48 mx-auto"></div>
                <p>(................................................)</p>
            </div>
            <div class="space-y-12">
                <p>Approved by</p>
                <div class="h-px bg-neutral-300 w-48 mx-auto"></div>
                <p>(................................................)</p>
            </div>
        </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: A3 landscape;
    margin: 1cm;
  }
  
  body {
    background: white !important;
  }

  /* Hide navigation, sidebar etc */
  aside, nav, .print\:hidden {
    display: none !important;
  }

  /* Reset layout constraints */
  .container {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Grid specific print tweaks */
  table {
    font-size: 8px !important;
  }
  
  /* Force colors in print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
</style>
