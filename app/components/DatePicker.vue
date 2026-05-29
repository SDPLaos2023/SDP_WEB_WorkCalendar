<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, CalendarDate, today } from '@internationalized/date'

const props = defineProps<{
  modelValue?: string | Date
  placeholder?: string
}>()

const emit = defineEmits(['update:modelValue'])

const df = new DateFormatter('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const internalDate = computed({
  get: () => {
    if (!props.modelValue) return null
    const d = new Date(props.modelValue)
    if (isNaN(d.getTime())) return null
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (val) => {
    if (val) {
      // Use YYYY-MM-DD format in local time to avoid timezone shifts
      const year = val.year
      const month = String(val.month).padStart(2, '0')
      const day = String(val.day).padStart(2, '0')
      emit('update:modelValue', `${year}-${month}-${day}`)
    } else {
      emit('update:modelValue', '')
    }
  }
})

const label = computed(() => {
  if (!props.modelValue) return props.placeholder || 'Select date'
  return formatDate(props.modelValue)
})
</script>

<template>
  <UPopover :content="{ align: 'start' }" :modal="true">
    <UButton
      color="neutral"
      variant="subtle"
      icon="i-heroicons-calendar"
      class="w-full justify-start text-left font-normal"
      :class="[!modelValue && 'text-neutral-400']"
    >
      {{ label }}
      <template #trailing>
        <UIcon name="i-heroicons-chevron-down" class="ml-auto text-neutral-400" />
      </template>
    </UButton>

    <template #content>
      <UCalendar
        v-model="internalDate"
        class="p-2"
      />
    </template>
  </UPopover>
</template>
