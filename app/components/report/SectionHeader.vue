<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <tr class="bg-primary-50/50 dark:bg-primary-900/10">
    <td colspan="56" class="px-4 py-2 text-sm font-bold text-primary-700 dark:text-primary-300 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wide">
      {{ name }}
    </td>
  </tr>
</template>
