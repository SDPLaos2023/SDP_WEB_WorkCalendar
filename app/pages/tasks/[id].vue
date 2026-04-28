<script setup lang="ts">
const { t } = useI18n()
import { format } from 'date-fns'
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
const selectedDate = ref('')

const auth = useAuth()
const toast = useToast()

const sortedActuals = computed(() => {
  if (!task.value?.actuals) return []
  return [...task.value.actuals].sort((a, b) => 
    new Date(b.actualDate).getTime() - new Date(a.actualDate).getTime()
  )
})

function getStatusColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'NOT_DONE') return 'error'
  return 'neutral'
}

function openUpdateWithDate(date: string) {
  // 1. Backdating check
  const selectedDateObj = new Date(`${date}T00:00:00`)
  selectedDateObj.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isBackdated = selectedDateObj < today
  const isFuture = selectedDateObj > today

  if (isFuture) {
    toast.add({
      title: t('common.error'),
      description: t('tasks.error_future_date') || 'You cannot log progress for future dates.',
      color: 'error',
      icon: 'i-heroicons-calendar'
    })
    return
  }

  if (isBackdated) {
    const isAssignedPerson = task.value?.assignedToId === auth.user.value?.id
    const isOfficer = auth.user.value?.role === 'OFFICER'

    // Condition A: If assigned person tries to backdate their own task
    if (isAssignedPerson && auth.user.value?.role !== 'SUPER_ADMIN') {
      toast.add({
        title: t('common.error'),
        description: t('tasks.error_self_backdate') || 'You cannot backdate your own tasks. Please contact your supervisor.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return
    }

    // Condition B: Basic role check for backdating
    if (isOfficer) {
      toast.add({
        title: t('common.error'),
        description: t('tasks.error_backdate_forbidden') || 'Backdating is not allowed for Officers. Please contact your supervisor.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return
    }
  }

  selectedDate.value = date
  isActualModalOpen.value = true
}

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


</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <UButton to="/tasks" variant="ghost" icon="i-heroicons-arrow-left" color="neutral">{{ t('common.back') }}</UButton>

    <div v-if="loading" class="space-y-4">
        <USkeleton class="h-10 w-1/2" />
        <USkeleton class="h-32 w-full" />
    </div>

    <div v-else-if="error || !task" class="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-error-500 mb-4" />
        <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-2">{{ error || t('common.none') }}</h3>
        <p class="text-neutral-500 mb-6">{{ t('common.error') }}</p>
        <UButton to="/tasks" color="neutral" variant="ghost">{{ t('common.back') }}</UButton>
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
            <UButton v-if="task.taskType === 'PROJECT'" size="xl" color="primary" icon="i-heroicons-plus" @click="isActualModalOpen = true">
              {{ t('tasks.update_progress') }}
            </UButton>
        </header>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Calendar Section (Left/Center) -->
          <div class="lg:col-span-2 space-y-6">
            <UCard :ui="{ body: 'p-0' }" class="overflow-hidden">
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-bold flex items-center gap-2">
                    <UIcon name="i-heroicons-calendar-days" class="text-primary" />
                    {{ t('tasks.calendar_view') }}
                  </h3>
                  <p class="text-xs text-neutral-500 uppercase font-bold tracking-widest">{{ task.taskType }}</p>
                </div>
              </template>

              <PlansRoutineTaskCalendar
                :task="task"
                @update-actual="(date: string) => {
                  // Set initial date for modal and open it
                  if (date) {
                    openUpdateWithDate(date)
                  }
                }"
              />
            </UCard>
          </div>

          <!-- Info & History (Right) -->
          <div class="space-y-6">
            <UCard v-if="task.description">
                <template #header>
                    <h3 class="font-bold">{{ t('common.description') }}</h3>
                </template>
                <p class="text-sm whitespace-pre-wrap text-neutral-600 dark:text-neutral-400 leading-relaxed">{{ task.description }}</p>
            </UCard>

            <UCard v-if="task.taskType === 'ROUTINE'">
                <template #header>
                    <h3 class="font-bold">{{ t('tasks.compliance') }}</h3>
                </template>
                <div v-if="task.compliance" class="space-y-4">
                    <div class="flex justify-between items-end">
                        <span class="text-4xl font-bold text-primary">{{ task.compliance.compliancePct }}%</span>
                        <span class="text-xs text-neutral-500 uppercase font-bold">{{ task.compliance.completedPeriods }} / {{ task.compliance.expectedPeriods }} {{ t('common.items') }}</span>
                    </div>
                    <UProgress :value="task.compliance.compliancePct" color="primary" size="sm" />
                </div>
            </UCard>

            <UCard v-else>
                <template #header>
                    <h3 class="font-bold">{{ t('tasks.project') }}</h3>
                </template>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-neutral-500">{{ t('tasks.planned_start') }}</span>
                        <span class="font-bold">{{ formatDate(task.plannedStart) }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-neutral-500">{{ t('tasks.planned_end') }}</span>
                        <span class="font-bold">{{ formatDate(task.plannedEnd) }}</span>
                    </div>
                    <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                        <span class="text-neutral-500">{{ t('common.status') }}</span>
                        <UBadge :label="t(`tasks.status_${task.status.toLowerCase()}`)" color="primary" variant="soft" class="font-bold" />
                    </div>
                </div>
            </UCard>

            <!-- History Section (sidebar) -->
            <UCard v-if="sortedActuals.length > 0">
                <template #header>
                    <div class="flex items-center justify-between">
                      <h3 class="font-bold flex items-center gap-2">
                        <UIcon name="i-heroicons-history" class="text-primary" />
                        {{ t('tasks.history') }}
                      </h3>
                      <UBadge :label="sortedActuals.length" variant="soft" color="neutral" size="sm" />
                    </div>
                </template>
                <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-100 dark:scrollbar-thumb-neutral-800">
                    <div 
                      v-for="actual in sortedActuals" 
                      :key="actual.id"
                      class="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 hover:border-primary-100 dark:hover:border-primary-900 transition-all group"
                    >
                      <div class="flex items-center justify-between mb-2">
                          {{ formatDate(actual.actualDate) }}
                        <UBadge 
                          :label="t(`tasks.status_${actual.status.toLowerCase()}`)" 
                          :color="getStatusColor(actual.status)" 
                          variant="soft" 
                          size="sm"
                          class="font-extrabold uppercase tracking-tighter"
                        />
                      </div>
                      
                      <div v-if="actual.note" class="text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black/20 p-2 rounded border border-neutral-100 dark:border-neutral-800/50 italic">
                        "{{ actual.note }}"
                      </div>
                      
                      <div class="mt-2 flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <span>{{ t('tasks.completion') }}</span>
                        <span class="text-primary">{{ actual.completionPct }}%</span>
                      </div>
                    </div>
                </div>
            </UCard>
          </div>
        </div>
    </div>

    <!-- Modals -->
    <PlansTaskActualFormModal
      v-model:open="isActualModalOpen"
      :task="task"
      :initial-date="selectedDate"
      @success="loadTask"
    />
  </div>
</template>
