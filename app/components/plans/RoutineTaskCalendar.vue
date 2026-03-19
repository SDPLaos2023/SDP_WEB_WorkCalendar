<script setup lang="ts">
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
  isBefore,
  startOfDay,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth
} from 'date-fns'

const props = defineProps<{
  task: any
}>()

const emit = defineEmits(['update-actual'])

const currentMonth = ref(new Date())
const viewType = ref<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH') // Switch between views

// Safe date parsing helper
function toDate(d: any): Date {
  if (!d) return new Date()
  if (d instanceof Date) return d
  return parseISO(d)
}

// Initialize calendar to the task's active period if today is outside
watch(() => props.task, (task) => {
  if (!task) return
  const today = startOfDay(new Date())

  if (task.recurrenceStart) {
    const start = startOfDay(toDate(task.recurrenceStart))
    const end = task.recurrenceEnd ? startOfDay(toDate(task.recurrenceEnd)) : new Date(8640000000000000)

    // If today is outside the range, move calendar to the start/end of the range
    if (isBefore(today, start)) {
      currentMonth.value = start
    } else if (isBefore(end, today)) {
      currentMonth.value = end
    }
  }
}, { immediate: true })

function nextMonth() {
  if (viewType.value === 'YEAR') {
    currentMonth.value = addMonths(currentMonth.value, 12)
  } else if (viewType.value === 'QUARTER') {
    currentMonth.value = addMonths(currentMonth.value, 3)
  } else {
    currentMonth.value = addMonths(currentMonth.value, 1)
  }
}

function prevMonth() {
  if (viewType.value === 'YEAR') {
    currentMonth.value = subMonths(currentMonth.value, 12)
  } else if (viewType.value === 'QUARTER') {
    currentMonth.value = subMonths(currentMonth.value, 3)
  } else {
    currentMonth.value = subMonths(currentMonth.value, 1)
  }
}

const days = computed(() => {
  const start = startOfWeek(startOfMonth(currentMonth.value), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(currentMonth.value), { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
})

const quarterMonths = computed(() => {
  const start = startOfQuarter(currentMonth.value)
  const end = endOfQuarter(currentMonth.value)
  return eachMonthOfInterval({ start, end })
})

const yearMonths = computed(() => {
  const start = startOfYear(currentMonth.value)
  const end = endOfYear(currentMonth.value)
  return eachMonthOfInterval({ start, end })
})

function getDaysForMonth(month: Date) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  return eachDayOfInterval({ start, end })
}

// Check if a date has an actual record
function getActualForDate(date: Date) {
  const actuals = props.task?.actuals
  if (!Array.isArray(actuals)) return null

  return actuals.find((a: any) => {
    if (!a.actualDate) return false
    try {
      const actualDate = toDate(a.actualDate)
      return isSameDay(actualDate, date)
    } catch (e) {
      return false
    }
  })
}

// Check if a date is within the task's valid window
function isDateInWindow(date: Date) {
  if (!props.task?.recurrenceStart) return true
  try {
    const start = startOfDay(toDate(props.task.recurrenceStart))
    const end = props.task.recurrenceEnd ? startOfDay(toDate(props.task.recurrenceEnd)) : new Date(8640000000000000)
    return isWithinInterval(startOfDay(date), { start, end })
  } catch (e) { return true }
}

// Check if a date is "expected" but missing (Routine logic)
function isExpectedAndMissing(date: Date) {
  if (getActualForDate(date)) return false
  if (!props.task?.recurrenceStart || !isDateInWindow(date)) return false

  // Only consider dates up to Today
  const today = startOfDay(new Date())
  const checkDate = startOfDay(date)
  if (isBefore(today, checkDate)) return false

  const type = props.task?.recurrenceType
  if (type === 'DAILY') return true
  if (type === 'WEEKLY') {
    try {
      const startDay = toDate(props.task.recurrenceStart).getDay()
      return date.getDay() === startDay
    } catch (e) { return false }
  }
  if (type === 'MONTHLY') {
    try {
      const startDate = toDate(props.task.recurrenceStart)
      // Same day of month, and check if it's N months after start
      const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth())
      return date.getDate() === startDate.getDate() && monthsDiff % 1 === 0
    } catch (e) { return false }
  }
  if (type === 'QUARTERLY') {
    try {
      const startDate = toDate(props.task.recurrenceStart)
      const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth())
      return date.getDate() === startDate.getDate() && monthsDiff % 3 === 0
    } catch (e) { return false }
  }
  if (type === 'YEARLY') {
    try {
      const startDate = toDate(props.task.recurrenceStart)
      return date.getDate() === startDate.getDate() && date.getMonth() === startDate.getMonth()
    } catch (e) { return false }
  }
  return false
}

function handleDateClick(date: Date) {
  if (!isDateInWindow(date)) return

  // Block future dates for Routine tasks
  const today = startOfDay(new Date())
  const checkDate = startOfDay(date)
  if (isBefore(today, checkDate)) return

  emit('update-actual', format(date, 'yyyy-MM-dd'))
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
</script>

<template>
  <div class="calendar-container bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
    <!-- Header & Toggle -->
    <div class="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 gap-4">
      <div class="flex items-center gap-3">
        <h3 class="text-lg font-bold font-heading">
          {{ viewType === 'MONTH' ? format(currentMonth, 'MMMM yyyy') : viewType === 'QUARTER' ? `Q${Math.floor(currentMonth.getMonth() / 3) + 1} ${currentMonth.getFullYear()}` : currentMonth.getFullYear() }}
        </h3>
        <!-- View Toggle -->
        <UTabs
          v-model="viewType"
          class="w-auto"
          :items="[
            { label: 'Month', value: 'MONTH' },
            { label: 'Quarter', value: 'QUARTER' },
            { label: 'Year', value: 'YEAR' }
          ]"
          :ui="{ list: { class: 'h-8 p-0.5' } }"
        />
      </div>

      <div class="flex gap-1">
        <UButton icon="i-heroicons-chevron-left" variant="ghost" color="neutral" size="sm" @click="prevMonth" />
        <UButton label="Today" variant="subtle" color="neutral" size="sm" @click="currentMonth = new Date()" />
        <UButton icon="i-heroicons-chevron-right" variant="ghost" color="neutral" size="sm" @click="nextMonth" />
      </div>
    </div>

    <!-- MONTH VIEW -->
    <template v-if="viewType === 'MONTH'">
      <div class="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
        <div v-for="day in weekDays" :key="day" class="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          {{ day }}
        </div>
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="date in days"
          :key="date.toISOString()"
          class="min-h-[80px] p-1 border-r border-b border-neutral-100 dark:border-neutral-800 last:border-r-0 relative group transition-colors"
          :class="[
            !isSameDay(date, currentMonth) && format(date, 'MM') !== format(currentMonth, 'MM') ? 'opacity-30 bg-neutral-50/50 dark:bg-neutral-900/50' : '',
            isDateInWindow(date) && !isBefore(startOfDay(new Date()), startOfDay(date)) ? 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-950/20' : 'cursor-not-allowed bg-neutral-100/30 dark:bg-neutral-800/20 opacity-50'
          ]"
          @click="handleDateClick(date)"
        >
          <span class="text-xs font-bold leading-none p-1.5 rounded-full inline-flex items-center justify-center w-7 h-7" :class="isToday(date) ? 'bg-primary text-white' : 'text-neutral-500'">
            {{ format(date, 'd') }}
          </span>
          <div class="mt-1 flex flex-col gap-1 px-1">
            <template v-if="getActualForDate(date)">
              <div class="rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 overflow-hidden whitespace-nowrap" :class="{'bg-success-100 text-success-700': getActualForDate(date).status === 'DONE', 'bg-warning-100 text-warning-700': getActualForDate(date).status === 'PARTIAL', 'bg-error-100 text-error-700': getActualForDate(date).status === 'NOT_DONE'}">
                <UIcon :name="getActualForDate(date).status === 'DONE' ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'" class="w-2.5 h-2.5" />
                <span>{{ getActualForDate(date).status }}</span>
              </div>
            </template>
            <template v-else-if="isExpectedAndMissing(date)">
               <div class="rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 border border-dashed" :class="isBefore(date, startOfDay(new Date())) ? 'bg-error-50 text-error-600 border-error-200' : 'bg-neutral-50 text-neutral-400 border-neutral-300'">
                 <UIcon :name="isBefore(date, startOfDay(new Date())) ? 'i-heroicons-exclamation-circle' : 'i-heroicons-clock'" class="w-2.5 h-2.5" />
                 <span>{{ isBefore(date, startOfDay(new Date())) ? 'Missing' : 'Pending' }}</span>
               </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- QUARTER / YEAR VIEW (Compact Grid) -->
    <template v-else>
      <div class="p-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto max-h-[500px]">
        <div v-for="month in (viewType === 'QUARTER' ? quarterMonths : yearMonths)" :key="month.toISOString()" class="space-y-2">
          <h4 class="text-xs font-bold uppercase text-neutral-400 tracking-tighter">{{ format(month, 'MMMM') }}</h4>
          <div class="grid grid-cols-7 gap-1">
            <!-- Blank days for start of month -->
            <div v-for="n in startOfMonth(month).getDay()" :key="'blank-'+n"></div>
            <!-- Month days (miniature) -->
            <div
              v-for="date in getDaysForMonth(month)"
              :key="date.toISOString()"
              class="w-full aspect-square rounded-[2px] cursor-pointer flex items-center justify-center text-[8px] transition-all hover:scale-110 border"
              :class="[
                isToday(date) ? 'border-primary-500 shadow-[0_0_4px_rgba(var(--color-primary-500),0.5)]' : 'border-transparent',
                getActualForDate(date) ? (getActualForDate(date).status === 'DONE' ? 'bg-success-500 text-white' : getActualForDate(date).status === 'PARTIAL' ? 'bg-warning-500 text-white' : 'bg-error-500 text-white') :
                isExpectedAndMissing(date) ? (isBefore(date, startOfDay(new Date())) ? 'bg-error-100 text-error-700 animate-pulse border-error-200' : 'bg-neutral-200 text-neutral-500') :
                isDateInWindow(date) ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400' : 'bg-transparent opacity-5'
              ]"
              @click="handleDateClick(date)"
            >
              <span v-if="getActualForDate(date) || isExpectedAndMissing(date) || isToday(date)" class="scale-75 origin-center capitalize">{{ format(date, 'd') }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Legend -->
    <div class="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900 opacity-80 flex flex-wrap gap-4 text-[10px] uppercase font-bold tracking-wider text-neutral-500">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-success-500"></span> Completed
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-warning-500"></span> Partial
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-error-500"></span> Not Done
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded border border-dashed border-neutral-400"></span> Expected
        </div>
    </div>
  </div>
</template>
