<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { apiFetch } = useAuth()
const { fetchById } = usePlanTask()
const task = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isActualModalOpen = ref(false)

const loadTask = async () => {
    loading.value = true
    error.value = null
    try {
        const taskId = route.params.id as string
        const response = await apiFetch<any>(`/api/plan-tasks/${taskId}`)
        if (response.success) {
            task.value = response.data
        }
    } catch (e: any) {
        console.error(e)
        error.value = e.data?.statusMessage || 'Failed to load task details.'
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadTask()
})

const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <UButton to="/tasks" variant="ghost" icon="i-heroicons-arrow-left" color="neutral">Back to My Tasks</UButton>

    <div v-if="loading" class="space-y-4">
        <USkeleton class="h-10 w-1/2" />
        <USkeleton class="h-32 w-full" />
    </div>

    <div v-else-if="error || !task" class="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-error-500 mb-4" />
        <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-2">{{ error || 'Task Not Found' }}</h3>
        <p class="text-neutral-500 mb-6">We couldn't retrieve the details for this task. It might have been deleted or you may not have permission to view it.</p>
        <UButton to="/tasks" color="neutral" variant="ghost">Return to My Tasks</UButton>
    </div>

    <div v-else class="space-y-6">
        <header class="flex justify-between items-start">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <UBadge :label="task.taskType" color="neutral" variant="outline" />
                    <UBadge :label="task.priority" color="warning" variant="soft" />
                </div>
                <h1 class="text-3xl font-bold font-heading">{{ task.taskName }}</h1>
                <p class="text-neutral-500">{{ task.workPlan?.title }}</p>
            </div>
            <UButton size="xl" color="primary" icon="i-heroicons-plus" @click="isActualModalOpen = true">Submit Update</UButton>
        </header>

        <UCard v-if="task.description">
            <template #header>
                <h3 class="font-bold">Description</h3>
            </template>
            <p class="whitespace-pre-wrap">{{ task.description }}</p>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UCard v-if="task.taskType === 'ROUTINE'">
                <template #header>
                    <h3 class="font-bold">Compliance Status</h3>
                </template>
                <div v-if="task.compliance" class="space-y-4">
                    <div class="flex justify-between items-end">
                        <span class="text-4xl font-bold text-primary">{{ task.compliance.compliancePct }}%</span>
                        <span class="text-sm text-neutral-500">{{ task.compliance.completedPeriods }} / {{ task.compliance.expectedPeriods }} periods</span>
                    </div>
                    <UProgress :value="task.compliance.compliancePct" color="primary" />
                </div>
            </UCard>

            <UCard v-else>
                <template #header>
                    <h3 class="font-bold">Project Timeline</h3>
                </template>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-neutral-500">Planned Start</span>
                        <span class="font-medium">{{ formatDate(task.plannedStart) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-neutral-500">Planned End</span>
                        <span class="font-medium">{{ formatDate(task.plannedEnd) }}</span>
                    </div>
                    <div class="flex justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span class="text-neutral-500">Current Status</span>
                        <UBadge :label="task.status" color="primary" />
                    </div>
                </div>
            </UCard>

            <UCard>
                <template #header>
                    <h3 class="font-bold">Update History</h3>
                </template>
                <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <div v-if="!task.actuals?.length" class="text-center py-10 text-neutral-400">
                        No updates Yet.
                    </div>
                    <div v-for="actual in task.actuals" :key="actual.id" class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800 space-y-2">
                        <div class="flex justify-between">
                            <span class="font-bold text-sm">{{ formatDate(actual.actualDate) }}</span>
                            <UBadge :label="`${actual.completionPct}%`" size="sm" variant="soft" />
                        </div>
                        <p v-if="actual.note" class="text-xs text-neutral-600 dark:text-neutral-400 italic">"{{ actual.note }}"</p>
                    </div>
                </div>
            </UCard>
        </div>
    </div>

    <!-- Modals -->
    <PlansTaskActualFormModal
      v-model:open="isActualModalOpen"
      :task="task"
      @success="loadTask"
    />
  </div>
</template>
