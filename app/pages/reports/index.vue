<script setup lang="ts">
import auth from '~/middleware/auth'

definePageMeta({
  middleware: auth
})

const reports = [
  {
    title: 'Work Plan Summary',
    description: 'Overview of all work plans, task counts, and average completion/compliance.',
    icon: 'i-heroicons-document-duplicate',
    to: '/reports/work-plan-summary',
    color: 'slate'
  },
  {
    title: 'Annual Work Plan (Gantt)',
    description: 'Comprehensive annual view of all tasks with weekly Plan vs Act timeline.',
    icon: 'i-heroicons-squares-plus',
    to: '/reports/work-plan',
    color: 'orange'
  },
  {
    title: 'Task Progress (Project)',
    description: 'Detailed progress and latest updates for all project-based tasks.',
    icon: 'i-heroicons-chart-bar',
    to: '/reports/task-progress',
    color: 'sky'
  },
  {
    title: 'Routine Compliance',
    description: 'Adherence report for recurring tasks, including missed periods.',
    icon: 'i-heroicons-check-circle',
    to: '/reports/compliance',
    color: 'emerald'
  },
  {
    title: 'KPI Achievement',
    description: 'Measured performance percentage (Planned vs Actual) for Officers and Supervisors.',
    icon: 'i-heroicons-trophy',
    to: '/reports/kpi',
    color: 'amber'
  },
  {
    title: 'Officer Performance',
    description: 'Individual performance metrics for aggregate task completion and compliance.',
    icon: 'i-heroicons-user-group',
    to: '/reports/officer-performance',
    color: 'zinc'
  }
]
</script>

<template>
  <div class="space-y-8">
    <header>
      <div class="flex items-center gap-2 text-primary mb-2">
        <UIcon name="i-heroicons-presentation-chart-line" />
        <span class="text-sm font-bold uppercase tracking-wider">Analytics</span>
      </div>
      <h1 class="text-3xl font-bold font-heading">Reports Hub</h1>
      <p class="text-neutral-500 dark:text-neutral-400 font-medium">Select a report type to view detailed analytics and export data.</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard
        v-for="report in reports"
        :key="report.to"
        class="group hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer overflow-hidden relative"
        @click="navigateTo(report.to)"
      >
        <div class="flex items-start gap-4">
          <div :class="`p-4 rounded-2xl bg-${report.color}-500/10 text-${report.color}-500 group-hover:scale-110 transition-transform`">
            <UIcon :name="report.icon" class="text-3xl" />
          </div>
          <div class="space-y-1">
            <h3 class="text-lg font-bold font-heading">{{ report.title }}</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {{ report.description }}
            </p>
          </div>
        </div>
        
        <div class="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <UIcon name="i-heroicons-arrow-right" class="text-primary text-xl" />
        </div>
      </UCard>
    </div>
  </div>
</template>
