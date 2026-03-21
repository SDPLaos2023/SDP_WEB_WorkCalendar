<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const { fetchById, current } = useWorkPlan()
const { fetchTasks, tasks } = usePlanTask()
const { user, hasRole } = useAuth()
const toast = useToast()

async function loadData() {
  const id = route.params.id as string
  if (!id) return
  await Promise.all([
    fetchById(id),
    fetchTasks(id)
  ])
}

onMounted(() => {
  loadData()
})

watch(() => route.params.id, (newId) => {
    if (newId) loadData()
})

const tabs = computed(() => [{
  label: t('tasks.project'),
  icon: 'i-heroicons-briefcase',
  slot: 'project'
}, {
  label: t('tasks.routine'),
  icon: 'i-heroicons-arrow-path',
  slot: 'routine'
}])

const UBadge = resolveComponent('UBadge')
const UProgress = resolveComponent('UProgress')
const UButtonComp = resolveComponent('UButton')

const projectTasks = computed(() => tasks.value.filter(t => t.taskType === 'PROJECT'))
const routineTasks = computed(() => tasks.value.filter(t => t.taskType === 'ROUTINE'))

const commonColumns = computed<TableColumn<any>[]>(() => [
  {
    accessorKey: 'taskName',
    header: t('tasks.name'),
    cell: ({ row }: any) => h('span', {
      class: 'font-bold cursor-pointer text-primary hover:underline',
      onClick: () => viewTask(row.original)
    }, row.getValue('taskName'))
  },
  {
    accessorKey: 'assignedTo',
    header: t('tasks.assign_to'),
    cell: ({ row }: any) => {
      const u = row.getValue('assignedTo') as any
      return u ? `${u.firstName} ${u.lastName}` : t('common.none')
    }
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }: any) => {
      const status = row.getValue('status') as string
      return h(UBadge, {
        label: status.replace('_', ' '),
        color: status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'error' : 'primary',
        variant: 'soft'
      })
    }
  }
])

const projectColumns = computed<TableColumn<any>[]>(() => [
  ...commonColumns.value,
  {
    accessorKey: 'id',
    header: t('tasks.completion'),
    cell: () => h(UProgress, { value: 65, class: 'w-32' })
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: any) => {
      const children = []
      children.push(h(UButtonComp, {
        icon: 'i-heroicons-play',
        label: 'Progress',
        size: 'xs',
        color: 'success',
        variant: 'ghost',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleDirectUpdate(row.original)
        }
      }))
      // if user can edit
      if (hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR']).value) {
        children.push(h(UButtonComp, {
          icon: 'i-heroicons-pencil',
          label: 'Edit',
          size: 'xs',
          color: 'primary',
          variant: 'ghost',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleEditTaskConfig(row.original)
          }
        }))
        children.push(h(UButtonComp, {
          icon: 'i-heroicons-trash',
          label: 'Delete',
          size: 'xs',
          color: 'error',
          variant: 'ghost',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleDeleteTask(row.original.id)
          }
        }))
      }
      return h('div', { class: 'flex gap-2 justify-end' }, children)
    }
  }
])

const routineColumns = computed<TableColumn<any>[]>(() => [
  ...commonColumns.value,
  {
    accessorKey: 'compliance.compliancePct',
    header: t('tasks.compliance'),
    cell: ({ row }: any) => {
      const pct = row.original.compliance?.compliancePct || 0
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UProgress, { value: pct, color: pct < 80 ? 'error' : pct < 100 ? 'warning' : 'success', class: 'w-16' }),
        h('span', { class: 'text-xs font-bold' }, `${pct}%`)
      ])
    }
  },
  {
    accessorKey: 'recurrenceType',
    header: t('tasks.frequency'),
    cell: ({ row }: any) => h(UBadge, { label: row.getValue('recurrenceType') as string, color: 'neutral', variant: 'subtle' })
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: ({ row }: any) => {
      const children = []
      children.push(h(UButtonComp, {
        icon: 'i-heroicons-play',
        label: 'Progress',
        size: 'xs',
        color: 'success',
        variant: 'ghost',
        onClick: (e: Event) => {
          e.stopPropagation()
          handleDirectUpdate(row.original)
        }
      }))
      if (hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR']).value) {
        children.push(h(UButtonComp, {
          icon: 'i-heroicons-pencil',
          label: 'Edit',
          size: 'xs',
          color: 'primary',
          variant: 'ghost',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleEditTaskConfig(row.original)
          }
        }))
        children.push(h(UButtonComp, {
          icon: 'i-heroicons-trash',
          label: 'Delete',
          size: 'xs',
          color: 'error',
          variant: 'ghost',
          onClick: (e: Event) => {
            e.stopPropagation()
            handleDeleteTask(row.original.id)
          }
        }))
      }
      return h('div', { class: 'flex gap-2 justify-end' }, children)
    }
  }
])

// Slideover state
const isDetailOpen = ref(false)
const isEditModalOpen = ref(false)
const isActualModalOpen = ref(false)
const isTaskEditModalOpen = ref(false)
const isSupervisorModalOpen = ref(false)
const taskToEdit = ref<any>(null)
const selectedTask = ref<any>(null)
const selectedDate = ref<string>('')
const selectedView = ref('calendar')

function viewTask(task: any) {
  selectedTask.value = task
  isDetailOpen.value = true
}

function handleUpdateActual(date: string) {
  selectedDate.value = date
  isDetailOpen.value = false // Close slideover to ensure modal is visible and context is clear
  isActualModalOpen.value = true
}

function handleDirectUpdate(task: any) {
  selectedTask.value = task
  selectedDate.value = '' // Reset date to today for direct list updates
  isActualModalOpen.value = true
}

function handleCreateTask() {
  taskToEdit.value = null
  isTaskEditModalOpen.value = true
}

function handleEditTaskConfig(task: any) {
  taskToEdit.value = task
  isTaskEditModalOpen.value = true
}

// Keep selectedTask in sync when the tasks list is refreshed
watch(() => tasks.value, (newTasks) => {
  if (selectedTask.value) {
    const updated = newTasks.find(t => t.id === selectedTask.value.id)
    if (updated) {
      selectedTask.value = updated
    }
  }
})

async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return
    
    try {
        const planId = route.params.id as string
        await usePlanTask().remove(planId, taskId)
        toast.add({ title: 'Task deleted successfully', color: 'success' })
        await fetchTasks(planId)
    } catch (e: any) {
        toast.add({ title: 'Failed to delete task', description: e.data?.statusMessage, color: 'error' })
    }
}

const isStatusLoading = ref(false)
async function handleStatusChange(newStatus: 'ACTIVE' | 'CLOSED') {
    const action = newStatus === 'ACTIVE' ? 'activate' : 'close'
    if (!confirm(`Are you sure you want to ${action} this work plan?`)) return

    isStatusLoading.value = true
    try {
        const id = route.params.id as string
        await useWorkPlan().changeStatus(id, newStatus)
        toast.add({ title: `Plan ${newStatus.toLowerCase()} successfully`, color: 'success' })
        await fetchById(id)
    } catch (e: any) {
        toast.add({ title: 'Failed to update status', description: e.data?.statusMessage, color: 'error' })
    } finally {
        isStatusLoading.value = false
    }
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'Invalid Date'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    dateStyle: 'medium'
  })
}

function formatTime(dateStr: string) {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="space-y-6">
    <PlansWorkPlanFormModal
      v-model:open="isEditModalOpen"
      :plan="current"
      @success="fetchById(route.params.id as string)"
    />

    <UButton to="/plans" variant="ghost" icon="i-heroicons-arrow-left" color="neutral">{{ t('common.back') }}</UButton>

    <div v-if="current" class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="flex-1">
        <UBadge :label="current.status" color="primary" variant="solid" class="mb-2" />
        <h1 class="text-3xl font-bold font-heading">{{ current.title }}</h1>
        <p class="text-neutral-500 font-medium whitespace-pre-wrap">
          {{ current.department?.name }} • {{ t('common.year') }} {{ current.year }}
          <br v-if="current.description" />
          <span v-if="current.description" class="text-sm">{{ current.description }}</span>
        </p>

        <!-- Supervisors Section -->
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-bold uppercase text-neutral-500">{{ t('plans.supervisors') }}:</span>
          <UBadge
            v-for="s in current.supervisors"
            :key="s.supervisorId"
            :label="`${s.supervisor.firstName} ${s.supervisor.lastName}`"
            color="primary"
            variant="soft"
            size="sm"
          />
          <UButton
            v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN'])"
            icon="i-heroicons-plus"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="isSupervisorModalOpen = true"
          >
            Assign
          </UButton>
          <span v-else-if="!current.supervisors?.length" class="text-sm italic text-neutral-400">{{ t('common.none') }}</span>
        </div>
      </div>
      <div class="flex gap-2">
         <!-- Status Transitions -->
         <UButton
            v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN']) && current.status === 'DRAFT'"
            icon="i-heroicons-check-circle"
            color="success"
            :loading="isStatusLoading"
            @click="handleStatusChange('ACTIVE')"
         >
            {{ t('plans.approve') }}
         </UButton>
         <UButton
            v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN']) && current.status === 'ACTIVE'"
            icon="i-heroicons-lock-closed"
            color="info"
             variant="outline"
            :loading="isStatusLoading"
            @click="handleStatusChange('CLOSED')"
         >
            {{ t('plans.close') }}
         </UButton>

         <UButton v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR'])" icon="i-heroicons-plus" color="primary" @click="handleCreateTask">{{ t('plans.add_task') }}</UButton>
         <UButton
            v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN'])"
            icon="i-heroicons-pencil"
            variant="outline"
            color="neutral"
            @click="isEditModalOpen = true"
         >
          {{ t('plans.edit') }}
         </UButton>
      </div>
    </div>

    <UTabs :items="tabs" class="w-full">
      <template #project>
        <UCard>
           <UTable :data="projectTasks" :columns="projectColumns">
             <template #empty-state>
               <div class="flex flex-col items-center justify-center py-12 gap-3 text-center">
                 <div class="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                   <UIcon name="i-heroicons-briefcase" class="text-2xl text-primary" />
                 </div>
                 <div>
                   <h3 class="font-bold text-neutral-800 dark:text-neutral-200">{{ t('plans.no_tasks_in_plan') }}</h3>
                   <p class="text-sm text-neutral-500 mt-1">
                     {{ hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR']) ? t('plans.no_tasks_hint') : t('plans.no_tasks_officer_hint') }}
                   </p>
                 </div>
                 <UButton v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR'])" icon="i-heroicons-plus" color="primary" @click="handleCreateTask">
                   {{ t('plans.add_task') }}
                 </UButton>
               </div>
             </template>
           </UTable>
        </UCard>
      </template>
      <template #routine>
        <UCard>
           <UTable :data="routineTasks" :columns="routineColumns">
             <template #empty-state>
               <div class="flex flex-col items-center justify-center py-12 gap-3 text-center">
                 <div class="w-14 h-14 rounded-xl bg-neutral-50 dark:bg-neutral-900/20 flex items-center justify-center">
                   <UIcon name="i-heroicons-arrow-path" class="text-2xl text-neutral-400" />
                 </div>
                 <div>
                   <h3 class="font-bold text-neutral-800 dark:text-neutral-200">{{ t('plans.no_tasks_in_plan') }}</h3>
                   <p class="text-sm text-neutral-500 mt-1">
                     {{ hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR']) ? t('plans.no_tasks_hint') : t('plans.no_tasks_officer_hint') }}
                   </p>
                 </div>
                 <UButton v-if="hasRole(['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN', 'SUPERVISOR'])" icon="i-heroicons-plus" color="primary" @click="handleCreateTask">
                   {{ t('plans.add_task') }}
                 </UButton>
               </div>
             </template>
           </UTable>
        </UCard>
      </template>
    </UTabs>

    <!-- Task Detail Slideover -->
    <USlideover v-model:open="isDetailOpen" title="Task Details" :ui="{ content: 'max-w-xl' }">
      <template #content>
        <div v-if="selectedTask" class="p-6 space-y-8 overflow-y-auto">
            <header>
                <div class="flex justify-between items-start mb-2">
                  <UBadge :label="selectedTask.taskType.replace('_', ' ')" color="neutral" variant="outline" />
                  <UBadge v-if="selectedTask.taskType === 'ROUTINE'" :label="`${selectedTask.compliance?.compliancePct}% Compliance`" :color="selectedTask.compliance?.compliancePct < 100 ? 'warning' : 'success'" variant="subtle" />
                </div>
                <h2 class="text-2xl font-bold font-heading">{{ selectedTask.taskName }}</h2>
                <p class="text-neutral-500">{{ selectedTask.description || 'No description provided.' }}</p>
            </header>

            <div class="grid grid-cols-2 gap-4">
                <div class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                    <p class="text-xs text-neutral-500 uppercase font-bold">{{ t('common.priority') }}</p>
                    <p class="font-bold">{{ selectedTask.priority }}</p>
                </div>
                <div class="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-md">
                    <p class="text-xs text-neutral-500 uppercase font-bold">{{ t('tasks.assign_to') }}</p>
                    <p class="font-bold">{{ selectedTask.assignedTo?.firstName }} {{ selectedTask.assignedTo?.lastName }}</p>
                </div>
            </div>

            <!-- Routine Specific Metrics -->
            <div v-if="selectedTask.taskType === 'ROUTINE'" class="space-y-6">
                <div class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  <p class="text-sm font-bold mb-3">{{ t('tasks.compliance_stats') }}</p>
                  <div class="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p class="text-2xl font-bold text-primary">{{ selectedTask.compliance?.completedPeriods }}</p>
                      <p class="text-xs text-neutral-500 uppercase">{{ t('tasks.completed_label') }}</p>
                    </div>
                    <div class="border-l border-neutral-100 dark:border-neutral-800">
                      <p class="text-2xl font-bold">{{ selectedTask.compliance?.expectedPeriods }}</p>
                      <p class="text-xs text-neutral-500 uppercase">{{ t('tasks.expected_label') }}</p>
                    </div>
                  </div>
                </div>

                <!-- Tracking Board -->
                <div class="space-y-4">
                  <p class="text-sm font-bold uppercase tracking-wider text-neutral-500">{{ t('tasks.tracking_board') }}</p>

                  <UTabs
                    :items="[
                      { label: t('tasks.calendar_view'), value: 'calendar', icon: 'i-heroicons-calendar-days', slot: 'calendar' },
                      { label: t('tasks.updates_view'), value: 'history', icon: 'i-heroicons-list-bullet', slot: 'history' }
                    ]"
                    class="w-full"
                  >
                    <template #calendar>
                       <div class="pt-4">
                         <PlansRoutineTaskCalendar :task="selectedTask" @update-actual="handleUpdateActual" />
                       </div>
                    </template>

                    <template #history>
                      <div class="pt-4 space-y-6">
                        <!-- Compliance summary in list view -->
                        <div v-if="selectedTask.compliance?.missedDates?.length" class="space-y-2">
                           <p class="text-xs font-bold text-error flex items-center gap-1">
                             <UIcon name="i-heroicons-exclamation-triangle" />
                             {{ t('tasks.missed_label') }} ({{ selectedTask.compliance.missedDates.length }})
                           </p>
                           <div class="flex flex-wrap gap-2">
                             <UBadge
                               v-for="date in selectedTask.compliance.missedDates"
                               :key="date"
                               :label="formatDate(date)"
                               variant="soft"
                               color="error"
                               size="xs"
                             />
                           </div>
                        </div>
                        <div v-else class="flex items-center gap-2 p-3 bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 rounded-md text-xs font-medium">
                          <UIcon name="i-heroicons-check-circle" />
                          {{ t('tasks.updates_view') }} — {{ t('tasks.completed_label') }}
                        </div>

                        <!-- Mini History Log -->
                        <div class="space-y-3">
                           <p class="text-xs font-bold uppercase text-neutral-400">{{ t('tasks.history') }}</p>
                           <div v-if="selectedTask.actuals?.length" class="space-y-3">
                              <div
                                v-for="log in selectedTask.actuals"
                                :key="log.id"
                                class="p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 shadow-sm"
                              >
                                <div class="flex justify-between items-start mb-1">
                                  <span class="text-xs font-bold">{{ formatDate(log.actualDate) }}</span>
                                  <UBadge :label="log.status.replace('_', ' ')" size="sm" variant="subtle" :color="log.status === 'DONE' ? 'success' : 'warning'" class="text-[10px]" />
                                </div>
                                <p v-if="log.note" class="text-[10px] text-neutral-500 italic">{{ log.note }}</p>
                              </div>
                           </div>
                           <p v-else class="text-center py-6 text-xs text-neutral-400 italic">No updates logged yet.</p>
                        </div>
                      </div>
                    </template>
                  </UTabs>
                </div>
            </div>

            <!-- Detailed Log (All Task Types) -->
            <div v-if="selectedTask.taskType === 'PROJECT'" class="space-y-4">
                <div class="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-bold uppercase tracking-wider text-neutral-500">History Log</p>
                    <UBadge
                        v-if="selectedTask.actuals?.length"
                        :label="selectedTask.actuals.length"
                        variant="subtle"
                        color="neutral"
                        size="sm"
                        class="rounded-full"
                    />
                  </div>
                </div>

                <div v-if="selectedTask.actuals?.length" class="space-y-4">
                  <div
                    v-for="log in selectedTask.actuals"
                    :key="log.id"
                    class="group p-4 border border-neutral-100 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden"
                  >
                    <!-- Status Indicator Stripe -->
                    <div
                      class="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                      :class="log.status === 'DONE' ? 'bg-success-500' : log.status === 'PARTIAL' ? 'bg-warning-500' : 'bg-error-500'"
                    ></div>

                    <div class="flex justify-between items-start mb-2">
                      <div class="space-y-0.5">
                        <span class="text-sm font-bold block">{{ formatDate(log.actualDate) }}</span>
                        <span class="text-[10px] text-neutral-400 uppercase font-semibold tracking-tight">Logged: {{ formatTime(log.createdAt) }}</span>
                      </div>
                      <UBadge :label="`${log.completionPct ?? 0}%`" size="sm" variant="soft" :color="log.completionPct >= 100 ? 'success' : 'primary'" class="font-bold" />
                    </div>

                    <!-- Aesthetic Note Display -->
                    <div v-if="log.note" class="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border-l-2 border-neutral-200 dark:border-neutral-700">
                      <p class="text-xs text-neutral-600 dark:text-neutral-400 italic leading-relaxed">
                        <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="inline-block mr-1 opacity-50" />
                        {{ log.note }}
                      </p>
                    </div>

                    <div class="flex justify-end mt-3">
                       <UBadge :label="log.status.replace('_', ' ')" size="sm" variant="subtle" :color="log.status === 'DONE' ? 'success' : log.status === 'PARTIAL' ? 'warning' : 'error'" class="text-[10px] py-0" />
                    </div>
                  </div>
                </div>

                <!-- Premium Empty State -->
                <div v-else class="py-12 flex flex-col items-center justify-center text-center bg-neutral-50/50 dark:bg-neutral-900/50 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-2xl">
                  <div class="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <UIcon name="i-heroicons-document-magnifying-glass" class="w-8 h-8 text-neutral-300" />
                  </div>
                  <p class="text-sm font-bold text-neutral-400">No records found yet</p>
                  <p class="text-xs text-neutral-400 mt-1 max-w-[150px]">Be the first to submit a progress update!</p>
                </div>
            </div>

            <!-- Overall Progress for Project -->
            <div v-if="selectedTask.taskType === 'PROJECT'" class="space-y-2">
                <div class="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  <div class="flex justify-between mb-1">
                    <span class="text-xs font-bold uppercase text-neutral-500">Overall Progress</span>
                    <span class="text-xs font-bold">{{ selectedTask.actuals?.[0]?.completionPct || 0 }}%</span>
                  </div>
                  <UProgress :value="selectedTask.actuals?.[0]?.completionPct || 0" color="primary" size="md" />
                </div>
            </div>

            <div class="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                 <UButton block color="primary" @click="isActualModalOpen = true; isDetailOpen = false">Submit Progress Update</UButton>
            </div>
        </div>
      </template>
    </USlideover>

    <!-- Task Actual Modal (Moved to end to ensure it stays on top of Slideover) -->
    <PlansTaskActualFormModal
      v-model:open="isActualModalOpen"
      :task="selectedTask"
      :initial-date="selectedDate"
      @success="fetchTasks(route.params.id as string); isDetailOpen = false"
    />

    <PlansTaskFormModal
      v-model:open="isTaskEditModalOpen"
      :plan-id="route.params.id as string"
      :task="taskToEdit"
      @success="fetchTasks(route.params.id as string)"
    />

    <PlansSupervisorAssignModal
      v-if="current"
      v-model:open="isSupervisorModalOpen"
      :plan-id="route.params.id as string"
      :current-supervisors="current.supervisors || []"
      @success="fetchById(route.params.id as string)"
    />
  </div>
</template>
