<script setup lang="ts">
const { t } = useI18n()
import SectionHeader from './SectionHeader.vue'
import TaskPairRow from './TaskPairRow.vue'

defineProps<{
  data: {
    sections: Array<{
      id: string
      name: string
      tasks: any[]
    }>
  }
}>()

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weeks = ['W1', 'W2', 'W3', 'W4']
</script>

<template>
  <div class="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm bg-white dark:bg-neutral-950">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse table-fixed select-none">
        <!-- Main Header -->
        <thead class="sticky top-0 z-30 bg-neutral-900 text-white">
          <tr>
            <th rowspan="2" class="sticky left-0 z-40 bg-neutral-900 px-3 py-3 text-xs font-bold border-r border-neutral-700 w-[40px]">No</th>
            <th rowspan="2" class="sticky left-[41px] z-40 bg-neutral-900 px-3 py-3 text-left text-xs font-bold border-r border-neutral-700 min-w-[200px] max-w-[300px]">{{ t('tasks.name') }}</th>
            <th rowspan="2" class="sticky left-[241px] z-40 bg-neutral-900 px-2 py-3 text-xs font-bold border-r border-neutral-700 w-[60px]">{{ t('management.department') }}</th>
            <th rowspan="2" class="sticky left-[301px] z-40 bg-neutral-900 px-2 py-3 text-left text-xs font-bold border-r border-neutral-700 w-[80px]">{{ t('tasks.assign_to') }}</th>
            <th rowspan="2" class="sticky left-[381px] z-40 bg-neutral-900 px-2 py-3 text-xs font-bold border-r border-neutral-700 w-[70px]">{{ t('tasks.frequency') }}</th>
            <th rowspan="2" class="sticky left-[451px] z-40 bg-neutral-900 px-2 py-3 text-xs font-bold border-r border-neutral-700 w-[40px]">P/A</th>
            
            <th v-for="month in months" :key="month" colspan="4" class="px-2 py-1.5 text-center text-[10px] font-bold border-r border-neutral-700 bg-neutral-800">
              {{ month }}
            </th>

            <th rowspan="2" class="px-3 py-3 text-xs font-bold border-l border-neutral-700 w-[80px]">{{ t('common.status') }}</th>
            <th rowspan="2" class="px-3 py-3 text-left text-xs font-bold w-[150px]">{{ t('common.description') }}</th>
          </tr>
          <tr class="bg-neutral-800">
            <template v-for="month in months" :key="month">
              <th v-for="week in weeks" :key="week" class="py-1 text-[9px] font-medium border-r border-neutral-700 w-[24px]">
                {{ week }}
              </th>
            </template>
          </tr>
        </thead>

        <!-- Body -->
        <tbody>
          <template v-for="section in data.sections" :key="section.id">
            <SectionHeader :name="section.name" />
            <TaskPairRow 
              v-for="(task, index) in section.tasks" 
              :key="task.id" 
              :task="{ ...task, no: index + 1 }" 
            />
          </template>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="!data.sections?.length" class="flex flex-col items-center justify-center py-20 bg-neutral-50 dark:bg-neutral-900/10">
      <UIcon name="i-heroicons-document-text" class="text-5xl text-neutral-300 mb-2" />
      <p class="text-neutral-500 font-medium">{{ t('common.none') }}</p>
    </div>
  </div>
</template>

<style scoped>
/* Ensure sticky columns don't have gaps */
th.sticky, td.sticky {
  background-clip: padding-box;
}

/* Custom scrollbar for better appearance */
::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d4d4d4;
  border-radius: 4px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #404040;
}
::-webkit-scrollbar-thumb:hover {
  background: #a3a3a3;
}
</style>
