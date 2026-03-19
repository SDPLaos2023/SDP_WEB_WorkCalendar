<script setup lang="ts">
const props = defineProps<{
  showPrint?: boolean
  showCSV?: boolean
  loading?: boolean
}>()

const emit = defineEmits(['csv'])

const handlePrint = () => {
  window.print()
}
</script>

<template>
  <div class="flex gap-2 print:hidden">
    <UButton
      v-if="showPrint"
      icon="i-heroicons-printer"
      variant="soft"
      color="neutral"
      @click="handlePrint"
    >
      Print / PDF
    </UButton>

    <UButton
      v-if="showCSV"
      icon="i-heroicons-arrow-down-tray"
      variant="soft"
      color="primary"
      :loading="loading"
      @click="emit('csv')"
    >
      Export CSV
    </UButton>
  </div>
</template>
