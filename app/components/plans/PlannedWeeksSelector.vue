<script setup lang="ts">
const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weeks = ['W1', 'W2', 'W3', 'W4']

const selectedWeeks = ref<Set<string>>(new Set())

// Initialize from prop
watch(() => props.modelValue, (val) => {
  if (val) {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        selectedWeeks.value = new Set(parsed)
      }
    } catch (e) {
      selectedWeeks.value = new Set()
    }
  } else {
    selectedWeeks.value = new Set()
  }
}, { immediate: true })

const toggleWeek = (month: string, week: string) => {
  const key = `${month}-${week}`
  if (selectedWeeks.value.has(key)) {
    selectedWeeks.value.delete(key)
  } else {
    selectedWeeks.value.add(key)
  }
  emit('update:modelValue', JSON.stringify(Array.from(selectedWeeks.value)))
}

const isSelected = (month: string, week: string) => {
  return selectedWeeks.value.has(`${month}-${week}`)
}

const clearAll = () => {
    selectedWeeks.value.clear()
    emit('update:modelValue', null)
}
</script>

<template>
  <div class="space-y-2 border rounded-xl p-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
    <div class="flex items-center justify-between mb-4">
        <label class="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            Planned Weeks (Select cells for the Annual Grid)
        </label>
        <UButton color="neutral" variant="ghost" size="xs" label="Clear All" @click="clearAll" />
    </div>

    <div class="overflow-x-auto pb-4 scrollbar-thin">
      <table class="border-separate border-spacing-1 min-w-[800px] w-full">
        <thead>
          <tr>
            <th v-for="month in months" :key="month" colspan="4" class="text-xs font-extrabold text-center text-slate-500 dark:text-slate-400 py-2 uppercase tracking-tighter">
              {{ month }}
            </th>
          </tr>
          <tr>
             <template v-for="month in months" :key="month">
                <th v-for="week in weeks" :key="week" class="text-[10px] font-medium text-center text-slate-400 dark:text-slate-500 pb-1">
                    {{ week }}
                </th>
             </template>
          </tr>
        </thead>
        <tbody>
          <tr>
            <template v-for="month in months" :key="month">
              <td v-for="week in weeks" :key="week" 
                  class="h-10 w-10 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-all duration-300 shadow-sm"
                  :class="isSelected(month, week) 
                    ? 'bg-primary-600 border-primary-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105 z-10' 
                    : 'bg-slate-50 dark:bg-slate-900/50 hover:border-primary-400 hover:bg-white dark:hover:bg-slate-800'"
                  @click="toggleWeek(month, week)">
                  <div v-if="isSelected(month, week)" class="flex items-center justify-center">
                    <UIcon name="i-heroicons-check" class="text-white w-5 h-5" />
                  </div>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
        <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-primary-500" />
        <span>เลือกสัปดาห์ที่ต้องการให้ปรากฏในตารางแผนงานรายปี (Annual Work Plan Grid)</span>
    </div>
  </div>
</template>
