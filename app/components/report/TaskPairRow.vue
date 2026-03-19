<script setup lang="ts">
const props = defineProps<{
  task: {
    no?: number
    taskName: string
    owner: string
    person: string
    frequency: string
    status: 'Open' | 'Closed'
    remarks: string
    planWeeks: string[]
    actWeeks: string[]
  }
}>()

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weeks = ['W1', 'W2', 'W3', 'W4']

const isPlanned = (month: string, week: string) => {
  return props.task.planWeeks.includes(`${month}-${week}`)
}

const isActual = (month: string, week: string) => {
  return props.task.actWeeks.includes(`${month}-${week}`)
}
</script>

<template>
  <!-- Plan Row -->
  <tr class="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-b border-neutral-100 dark:border-neutral-800">
    <td class="sticky left-0 bg-white dark:bg-neutral-950 z-10 px-3 py-2 text-xs text-neutral-500 border-r border-neutral-100 dark:border-neutral-800">
      {{ task.no }}
    </td>
    <td class="sticky left-[41px] bg-white dark:bg-neutral-950 z-10 px-3 py-2 text-xs font-medium text-neutral-900 dark:text-neutral-100 border-r border-neutral-100 dark:border-neutral-800 min-w-[200px] max-w-[300px] truncate">
      {{ task.taskName }}
    </td>
    <td class="sticky left-[241px] bg-white dark:bg-neutral-950 z-10 px-2 py-2 text-[10px] text-center text-neutral-500 border-r border-neutral-100 dark:border-neutral-800 w-[60px]">
      {{ task.owner }}
    </td>
    <td class="sticky left-[301px] bg-white dark:bg-neutral-950 z-10 px-2 py-2 text-[10px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-100 dark:border-neutral-800 w-[80px] truncate">
      {{ task.person.split(' ')[0] }}
    </td>
    <td class="sticky left-[381px] bg-white dark:bg-neutral-950 z-10 px-2 py-2 text-[10px] text-center text-neutral-500 border-r border-neutral-100 dark:border-neutral-800 w-[70px]">
      {{ task.frequency }}
    </td>
    <td class="sticky left-[451px] bg-white dark:bg-neutral-950 z-10 px-2 py-2 text-[10px] font-bold text-center text-primary-500 border-r border-neutral-200 dark:border-neutral-800 w-[40px]">
      Plan
    </td>

    <template v-for="month in months" :key="month">
      <td v-for="week in weeks" :key="week" 
          class="p-0 border-r border-neutral-50 dark:border-neutral-800/50 w-[24px] text-center align-middle"
          :class="{ 'bg-primary-50/30 dark:bg-primary-900/5': isPlanned(month, week) }">
        <div v-if="isPlanned(month, week)" class="w-4 h-4 mx-auto rounded-sm bg-primary-500 flex items-center justify-center">
            <span class="text-[10px] text-white">X</span>
        </div>
        <span v-else class="text-neutral-200 dark:text-neutral-800">·</span>
      </td>
    </template>

    <td class="px-3 py-2 text-xs text-center border-l border-neutral-200 dark:border-neutral-800 w-[80px]">
      <UBadge :color="task.status === 'Closed' ? 'success' : 'primary'" variant="subtle" size="xs">
        {{ task.status }}
      </UBadge>
    </td>
    <td class="px-3 py-2 text-[10px] text-neutral-500 italic max-w-[150px] truncate">
      {{ task.remarks }}
    </td>
  </tr>

  <!-- Act Row -->
  <tr class="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-b border-neutral-200 dark:border-neutral-800">
    <td class="sticky left-0 bg-white dark:bg-neutral-950 z-10 px-3 py-2 border-r border-neutral-100 dark:border-neutral-800"></td>
    <td class="sticky left-[41px] bg-white dark:bg-neutral-950 z-10 px-3 py-2 border-r border-neutral-100 dark:border-neutral-800"></td>
    <td class="sticky left-[241px] bg-white dark:bg-neutral-950 z-10 px-3 py-2 border-r border-neutral-100 dark:border-neutral-800"></td>
    <td class="sticky left-[301px] bg-white dark:bg-neutral-950 z-10 px-3 py-2 border-r border-neutral-100 dark:border-neutral-800"></td>
    <td class="sticky left-[381px] bg-white dark:bg-neutral-950 z-10 px-3 py-2 border-r border-neutral-100 dark:border-neutral-800"></td>
    <td class="sticky left-[451px] bg-white dark:bg-neutral-950 z-10 px-2 py-2 text-[10px] font-bold text-center text-green-500 border-r border-neutral-200 dark:border-neutral-800">
      Act
    </td>

    <template v-for="month in months" :key="month">
      <td v-for="week in weeks" :key="week" 
          class="p-0 border-r border-neutral-50 dark:border-neutral-800/50 w-[24px] text-center align-middle"
          :class="{ 'bg-green-50/30 dark:bg-green-900/5': isActual(month, week) }">
        <div v-if="isActual(month, week)" class="w-4 h-4 mx-auto rounded-sm bg-green-500 flex items-center justify-center">
             <span class="text-[10px] text-white">X</span>
        </div>
        <span v-else class="text-neutral-200 dark:text-neutral-800">·</span>
      </td>
    </template>

    <td class="border-l border-neutral-200 dark:border-neutral-800"></td>
    <td></td>
  </tr>
</template>
