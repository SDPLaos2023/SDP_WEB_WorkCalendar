<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import auth from '~/middleware/auth'
import type { PlanTask } from '~/composables/usePlanTask'

definePageMeta({
  middleware: auth
})

const { plans, loading, fetchPlans, remove } = useWorkPlan()
const { apiFetch, user, role, hasRole } = useAuth()
const toast = useToast()

const filters = reactive({
  year: new Date().getFullYear(),
  status: 'ALL'
})

const years = [2024, 2025, 2026]
const statuses = computed(() => [
  { label: t('common.all'), value: 'ALL' },
  { label: t('plans.status_draft'), value: 'DRAFT' },
  { label: t('plans.status_active'), value: 'ACTIVE' },
  { label: t('plans.status_closed'), value: 'CLOSED' }
])

onMounted(() => {
  fetchPlans(filters)
})

watch(filters, () => {
  fetchPlans(filters)
}, { deep: true })

const canCreate = hasRole(['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])

// ─── Expansion Logic ────────────────────────────────────────────────────────
const expandedRowId = ref<string | null>(null)
const tasksMap = ref<Record<string, PlanTask[]>>({})
const loadingTasks = ref<Record<string, boolean>>({})

async function toggleExpand(planId: string) {
  // If clicking same row, toggle it off
  if (expandedRowId.value === planId) {
    expandedRowId.value = null
    return
  }

  // Set new expanded id (this closes others automatically)
  expandedRowId.value = planId

  // Fetch if not yet loaded
  if (!tasksMap.value[planId]) {
    await fetchTasksForPlan(planId)
  }
}

async function fetchTasksForPlan(planId: string) {
  loadingTasks.value[planId] = true
  try {
    const res = await apiFetch<any>(`/api/work-plans/${planId}/tasks`)
    if (res?.success) {
      tasksMap.value[planId] = res.data
    }
  } catch (err) {
    toast.add({ title: t('common.error'), color: 'error' })
  } finally {
    loadingTasks.value[planId] = false
  }
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────
function taskTypeBadge(type: string) {
  return type === 'PROJECT' ? { label: 'PRJ', color: 'info' } : { label: 'RTN', color: 'warning' }
}

function taskStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'neutral',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    DONE: 'success',
    CANCELLED: 'error'
  }
  return map[status] ?? 'neutral'
}

function priorityColor(priority: string) {
  const map: Record<string, string> = {
    LOW: 'neutral',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'error',
    URGENT: 'error'
  }
  return map[priority] ?? 'neutral'
}

const isDeleteModalOpen = ref(false)
const planToDelete = ref<string | null>(null)
const isEditModalOpen = ref(false)
const selectedPlan = ref<any>(null)

// ─── Task Update & Calendar ────────────────────────────────────────────────
const isCalendarModalOpen = ref(false)
const isActualModalOpen = ref(false)
const selectedTaskForUpdate = ref<any>(null)
const selectedDateForUpdate = ref<string>('')

function openCalendar(task: any) {
  selectedTaskForUpdate.value = task
  isCalendarModalOpen.value = true
}

function handleDateSelectInCalendar(date: string) {
  // 1. Backdating check - Force local time to prevent offset issues
  const selectedDateObj = new Date(`${date}T00:00:00`)

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
    const task = selectedTaskForUpdate.value
    const isAssignedPerson = task?.assignedToId === user.value?.id
    const isOfficer = role.value === 'OFFICER'

    if (isAssignedPerson && role.value !== 'SUPER_ADMIN') {
      toast.add({
        title: t('common.error'),
        description: t('tasks.error_self_backdate') || 'You cannot backdate your own tasks. Please contact your supervisor.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return
    }

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

  selectedDateForUpdate.value = date
  isCalendarModalOpen.value = false
  isActualModalOpen.value = true
}

function openEditModal(plan: any) {
  selectedPlan.value = plan
  isEditModalOpen.value = true
}

function confirmDelete(id: string) {
  planToDelete.value = id
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!planToDelete.value) return
  try {
    await remove(planToDelete.value)
    toast.add({ title: t('common.success'), color: 'success' })
    isDeleteModalOpen.value = false
  } catch (err) {
    toast.add({ title: t('common.error'), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 text-gray-900 dark:text-white">
    <PlansWorkPlanFormModal
      v-model:open="isEditModalOpen"
      :plan="selectedPlan"
      @success="fetchPlans(filters)"
    />
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold font-heading">{{ t('plans.title') }}</h1>
        <p class="text-neutral-500 font-medium">{{ t('plans.subtitle') }}</p>
      </div>
      <UButton v-if="canCreate" to="/plans/create" icon="i-heroicons-plus" color="primary" class="font-bold">
        {{ t('plans.new') }}
      </UButton>
    </div>

    <!-- Filter Bar -->
    <UCard>
      <div class="flex flex-wrap gap-4">
        <USelect v-model="filters.year" :items="years" class="w-32" />
        <USelect v-model="filters.status" :items="statuses" label-key="label" value-key="value" placeholder="All Statuses" class="w-48" />
      </div>
    </UCard>

    <!-- Plans Table -->
    <UCard class="p-0 overflow-hidden shadow-sm border-neutral-200 dark:border-neutral-800">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <tr class="text-xs font-bold uppercase tracking-wider text-neutral-500">
              <th class="w-12 p-4"></th>
              <th class="p-4">{{ t('plans.title') }}</th>
              <th class="p-4">{{ t('plans.department') }}</th>
              <th class="p-4">{{ t('common.year') }}</th>
              <th class="p-4">{{ t('tasks.title') }}</th>
              <th class="p-4">{{ t('tasks.completion') }}</th>
              <th class="p-4">{{ t('common.status') }}</th>
              <th class="p-4 text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <template v-for="plan in plans" :key="plan.id">
              <tr
                class="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors cursor-pointer"
                @click="toggleExpand(plan.id)"
              >
                <!-- Expand Icon -->
                <td class="p-4 text-center">
                  <UIcon
                    :name="expandedRowId === plan.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                    class="text-neutral-400 group-hover:text-primary transition-colors text-lg"
                  />
                </td>

                <!-- Plan Info -->
                <td class="p-4">
                  <NuxtLink :to="`/plans/${plan.id}`" class="font-bold text-primary hover:underline" @click.stop>
                    {{ plan.title }}
                  </NuxtLink>
                </td>
                <td class="p-4 text-neutral-500 text-sm">{{ plan.department?.name || '-' }}</td>
                <td class="p-4 text-sm">{{ plan.year }}</td>
                <td class="p-4">
                  <UBadge :label="plan._count?.tasks || 0" color="neutral" variant="soft" size="sm" />
                </td>
                <td class="p-4">
                   <UProgress :value="Math.floor(Math.random() * 100)" class="w-20" />
                </td>
                <td class="p-4">
                  <UBadge
                    :label="t(`plans.status_${plan.status.toLowerCase()}`)"
                    :color="plan.status === 'ACTIVE' ? 'success' : plan.status === 'DRAFT' ? 'neutral' : 'info'"
                    variant="subtle"
                  />
                </td>

                <!-- Actions -->
                <td class="p-4">
                  <div class="flex justify-end gap-1">
                    <UButton icon="i-heroicons-eye" variant="ghost" color="neutral" :to="`/plans/${plan.id}`" @click.stop />
                    <UButton icon="i-heroicons-pencil" variant="ghost" color="neutral" @click.stop="openEditModal(plan)" />
                    <UButton v-if="canCreate" icon="i-heroicons-trash" variant="ghost" color="error" @click.stop="confirmDelete(plan.id)" />
                  </div>
                </td>
              </tr>

              <!-- Expanded Task Table (Premium Design) -->
              <tr v-if="expandedRowId === plan.id">
                <td colspan="8" class="p-0 bg-neutral-50 dark:bg-neutral-900 shadow-inner">
                  <div class="p-4 md:p-6 border-l-4 border-primary ml-10 my-2">
                    <div class="bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                      <div class="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <UIcon name="i-heroicons-clipboard-document-list" class="text-primary text-xl" />
                          <h4 class="font-bold text-sm text-neutral-800 dark:text-neutral-200">
                             {{ t('tasks.title') }} ({{ plan.title }})
                          </h4>
                        </div>
                        <UBadge :label="`${tasksMap[plan.id]?.length || 0} ${t('common.items')}`" color="neutral" variant="soft" size="sm" />
                      </div>

                      <!-- Loading State -->
                      <div v-if="loadingTasks[plan.id]" class="flex flex-col items-center justify-center gap-3 py-10">
                        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-primary" />
                        <span class="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{{ t('common.loading') }}...</span>
                      </div>

                      <!-- Task Content -->
                      <div v-else>
                        <div v-if="!tasksMap[plan.id]?.length" class="flex flex-col items-center gap-3 py-12 text-center">
                          <div class="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                            <UIcon name="i-heroicons-inbox" class="text-xl text-neutral-400" />
                          </div>
                          <p class="text-sm text-neutral-500 font-medium">{{ t('tasks.no_tasks') }}</p>
                        </div>

                        <div v-else class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead class="bg-neutral-50/50 dark:bg-neutral-900/50">
                              <tr class="text-left text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-800">
                                <th class="px-6 py-4">{{ t('tasks.name') }}</th>
                                <th class="px-4 py-4">{{ t('tasks.type') }}</th>
                                <th class="px-4 py-4">{{ t('common.priority') }}</th>
                                <th class="px-4 py-4">{{ t('common.status') }}</th>
                                <th class="px-4 py-4">{{ t('tasks.assign_to') }}</th>
                                <th class="px-4 py-4 text-right">{{ t('tasks.task_timeline') }}</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                              <tr
                                v-for="task in tasksMap[plan.id]"
                                :key="task.id"
                                class="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors group/task"
                              >
                                <td class="px-6 py-4">
                                  <div class="flex flex-col">
                                    <NuxtLink
                                      :to="`/tasks/${task.id}`"
                                      class="font-bold text-neutral-900 dark:text-white group-hover/task:text-primary transition-colors inline-flex items-center gap-1.5"
                                    >
                                      {{ task.taskName }}
                                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="text-[10px] opacity-0 group-hover/task:opacity-100 transition-opacity" />
                                    </NuxtLink>
                                    <span v-if="task.description" class="text-[11px] text-neutral-400 mt-1 line-clamp-1 max-w-sm">{{ task.description }}</span>
                                  </div>
                                </td>
                                <td class="px-4 py-4">
                                  <UBadge
                                    :label="taskTypeBadge(task.taskType).label"
                                    :color="taskTypeBadge(task.taskType).color as any"
                                    variant="soft"
                                    size="sm"
                                    class="rounded-lg shadow-sm font-bold"
                                  />
                                </td>
                                <td class="px-4 py-4">
                                  <div class="flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full" :class="{
                                      'bg-neutral-400': task.priority === 'LOW',
                                      'bg-info-500': task.priority === 'MEDIUM',
                                      'bg-warning-500': task.priority === 'HIGH',
                                      'bg-error-500': ['CRITICAL', 'URGENT'].includes(task.priority)
                                    }"></span>
                                    <span class="text-xs font-semibold" :class="`text-${priorityColor(task.priority)}-600 dark:text-${priorityColor(task.priority)}-400`">{{ task.priority }}</span>
                                  </div>
                                </td>
                                <td class="px-4 py-4">
                                  <UBadge
                                    :label="t(`tasks.status_${task.status.toLowerCase()}`)"
                                    :color="taskStatusColor(task.status) as any"
                                    variant="subtle"
                                    size="sm"
                                    class="font-bold border border-current/10"
                                  />
                                </td>
                                <td class="px-4 py-4">
                                  <div class="flex items-center gap-2">
                                    <UAvatar
                                      :alt="task.assignedTo?.firstName"
                                      size="2xs"
                                      :ui="{ rounded: 'rounded-lg' }"
                                    />
                                    <span class="text-neutral-600 dark:text-neutral-300 font-medium whitespace-nowrap">{{ task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '-' }}</span>
                                  </div>
                                </td>
                                <td class="px-4 py-4 text-right">
                                  <div class="flex items-center justify-end gap-3">
                                    <div class="flex flex-col items-end gap-1">
                                      <div class="flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                                        <span>{{ formatDate(task.plannedStart || task.recurrenceStart) }}</span>
                                        <span>→</span>
                                        <span>{{ formatDate(task.plannedEnd || task.recurrenceEnd) }}</span>
                                      </div>
                                      <div class="w-20">
                                        <UProgress :value="Math.random() * 100" size="2xs" color="primary" />
                                      </div>
                                    </div>
                                    <UButton icon="i-heroicons-calendar-days" color="primary" variant="subtle" size="sm" @click="openCalendar(task)" />
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-if="!plans?.length && !loading">
              <td colspan="8" class="p-16 text-center">
                <div class="flex flex-col items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <UIcon name="i-heroicons-clipboard-document-list" class="text-3xl text-primary" />
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-neutral-900 dark:text-white">{{ t('plans.no_plans') }}</h3>
                    <p class="text-sm text-neutral-500 mt-1 max-w-sm">{{ canCreate ? t('plans.no_plans_manager') : t('plans.no_plans_officer') }}</p>
                  </div>
                  <UButton v-if="canCreate" to="/plans/create" icon="i-heroicons-plus" color="primary">{{ t('plans.new') }}</UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Delete Confirmation -->
    <UModal v-model:open="isDeleteModalOpen" :title="t('plans.delete')">
      <template #content>
        <div class="p-6">
            <h3 class="text-xl font-bold mb-2">{{ t('plans.confirm_delete') }}</h3>
            <p class="text-neutral-500 mb-6 font-medium">{{ t('plans.delete_warning') }}</p>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">{{ t('common.cancel') }}</UButton>
              <UButton color="error" class="font-bold" @click="handleDelete">{{ t('common.delete') }}</UButton>
            </div>
        </div>
      </template>
    </UModal>

    <!-- Task Calendar Modal -->
    <UModal v-model:open="isCalendarModalOpen" :title="selectedTaskForUpdate?.taskName" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div class="p-6">
          <div class="mb-6">
            <h3 class="text-xl font-bold flex items-center gap-2">
              <UIcon name="i-heroicons-calendar-days" class="text-primary" />
              {{ t('tasks.calendar_view') }}
            </h3>
            <p class="text-sm text-neutral-500">{{ selectedTaskForUpdate?.taskName }}</p>
          </div>
          <PlansRoutineTaskCalendar
            :task="selectedTaskForUpdate"
            @update-actual="handleDateSelectInCalendar"
          />
        </div>
      </template>
    </UModal>

    <!-- Task Actual Form Modal -->
    <PlansTaskActualFormModal
      v-model:open="isActualModalOpen"
      :task="selectedTaskForUpdate"
      :initial-date="selectedDateForUpdate"
      @success="fetchTasksForPlan(selectedTaskForUpdate.workPlanId)"
    />
  </div>
</template>
