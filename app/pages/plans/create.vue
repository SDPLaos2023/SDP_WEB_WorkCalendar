<script setup lang="ts">
import { createWorkPlanSchema } from '~~/shared/schemas/work-plan.schema'
import { createPlanTaskSchema } from '~~/shared/schemas/plan-task.schema'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: 'auth',
  roles: ['MANAGER', 'ADMIN_COMPANY', 'SUPER_ADMIN']
})

const { create: createPlan } = useWorkPlan()
const { create: createTask } = usePlanTask()
const { apiFetch, user, role } = useAuth()
const loadingDepartments = ref(false)
const departments = ref<any[]>([])
const loadingUsers = ref(false)
const users = ref<any[]>([])

const toast = useToast()

const step = ref(1)
const steps = [
  { title: 'Information', description: 'Basic plan details' },
  { title: 'Tasks', description: 'Add activities' },
  { title: 'Review', description: 'Final check' }
]

// Step 1: Plan Info
const planState = reactive({
  title: '',
  year: new Date().getFullYear(),
  planStartDate: new Date().toISOString().split('T')[0],
  planEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
  departmentId: '',
  supervisorIds: [] as string[]
})

async function fetchDepartments() {
  loadingDepartments.value = true
  try {
    const res = await apiFetch<any>('/api/departments?limit=100')
    if (res.success) {
      departments.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch departments', err)
  } finally {
    loadingDepartments.value = false
  }
}

async function fetchUsers() {
  loadingUsers.value = true
  try {
    const res = await apiFetch<any>('/api/users?limit=200')
    if (res.success) {
      users.value = res.data.map((u: any) => ({
        ...u,
        fullName: `${u.firstName} ${u.lastName}`
      }))
    }
  } catch (err) {
    console.error('Failed to fetch users', err)
  } finally {
    loadingUsers.value = false
  }
}

const selectedDepartmentName = computed(() => {
  return departments.value.find(d => d.id === planState.departmentId)?.name || 'Not selected'
})

const availableSupervisors = computed(() => {
  return users.value.filter(u => u.role === 'SUPERVISOR')
})

const availableOfficers = computed(() => {
  return users.value.filter(u => 
    u.departmentId === planState.departmentId && 
    ['MANAGER', 'SUPERVISOR', 'OFFICER'].includes(u.role)
  )
})

onMounted(() => {
  fetchDepartments()
  fetchUsers()
})

// Step 2: Tasks
const tasks = ref<any[]>([])
const currentTask = reactive({
  taskName: '',
  taskType: 'PROJECT' as 'PROJECT' | 'ROUTINE',
  priority: 'MEDIUM',
  assignedToId: '',
  // Project
  plannedStart: new Date().toISOString().split('T')[0],
  plannedEnd: new Date().toISOString().split('T')[0],
  // Routine
  recurrenceType: 'DAILY',
  recurrenceStart: new Date().toISOString().split('T')[0],
  recurrenceEnd: new Date().toISOString().split('T')[0],
  isRecurring: true
})

function sanitizeTaskForApi(raw: typeof currentTask) {
  const base: Record<string, any> = {
    taskName: raw.taskName,
    taskType: raw.taskType,
    priority: raw.priority,
    assignedToId: raw.assignedToId || null,
  }

  if (raw.taskType === 'PROJECT') {
    base.plannedStart = raw.plannedStart
    base.plannedEnd = raw.plannedEnd
  } else {
    base.recurrenceType = raw.recurrenceType
    base.recurrenceStart = raw.recurrenceStart
    base.recurrenceEnd = raw.recurrenceEnd
  }

  return base
}

function addTask() {
  tasks.value.push(sanitizeTaskForApi(currentTask))
  // Reset task form
  currentTask.taskName = ''
}

function removeTask(index: number) {
  tasks.value.splice(index, 1)
}

async function submitAll() {
  let createdPlanId: string | null = null
  try {
    const plan = await createPlan(planState as any)
    if (!plan?.id) {
      toast.add({ title: 'Failed to create plan', color: 'error' })
      return
    }
    createdPlanId = plan.id

    // Create tasks sequentially
    const failedTasks: string[] = []
    for (const task of tasks.value) {
      try {
        await createTask(plan.id, task)
      } catch (taskErr: any) {
        failedTasks.push(task.taskName || 'Unknown task')
        console.error('[CREATE_TASK_ERROR]:', taskErr)
      }
    }

    if (failedTasks.length > 0) {
      toast.add({
        title: `Plan created but ${failedTasks.length} task(s) failed`,
        description: `Failed: ${failedTasks.join(', ')}. You can add them from the plan page.`,
        color: 'warning'
      })
      navigateTo(`/plans/${plan.id}`)
    } else {
      toast.add({ title: 'Plan and Tasks created!', color: 'success' })
      navigateTo('/plans')
    }
  } catch (err: any) {
    if (createdPlanId) {
      // Plan was created but something else failed — navigate to plan
      toast.add({ title: 'Plan created, but an error occurred', description: err.data?.statusMessage, color: 'warning' })
      navigateTo(`/plans/${createdPlanId}`)
    } else {
      toast.add({ title: 'Failed to create plan', description: err.data?.statusMessage, color: 'error' })
    }
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <header>
      <h1 class="text-3xl font-bold font-heading">Create New Work Plan</h1>
      <p class="text-neutral-500 font-medium">Follow the steps to establish a new departmental goal</p>
    </header>

    <!-- Manual Stepper -->
    <div class="flex items-center justify-between">
        <div v-for="(s, i) in steps" :key="i" class="flex flex-col items-center gap-2 flex-1 relative">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold z-10', step > i ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500']">
                {{ i + 1 }}
            </div>
            <span :class="['text-sm font-semibold', step === i + 1 ? 'text-primary' : 'text-neutral-500']">{{ s.title }}</span>
            <div v-if="i < steps.length - 1" class="absolute top-5 left-1/2 w-full h-[2px] bg-neutral-200"></div>
        </div>
    </div>

    <UCard>
      <!-- Step 1: Info -->
      <div v-if="step === 1" class="space-y-6">
        <UForm :schema="createWorkPlanSchema" :state="planState" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormField label="Plan Title" name="title" class="md:col-span-2">
            <UInput v-model="planState.title" placeholder="e.g. Annual IT Infrastructure Upgrade" />
          </UFormField>

          <UFormField label="Year" name="year">
            <UInput v-model.number="planState.year" type="number" />
          </UFormField>

          <UFormField label="Department" name="departmentId">
            <USelect
              v-model="planState.departmentId"
              :items="departments"
              label-key="name"
              value-key="id"
              placeholder="Select Department"
              :loading="loadingDepartments"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Start Date" name="planStartDate">
            <UInput v-model="planState.planStartDate" type="date" />
          </UFormField>

          <UFormField label="End Date" name="planEndDate">
             <UInput v-model="planState.planEndDate" type="date" />
          </UFormField>

          <UFormField label="Supervisors (Management)" name="supervisorIds" class="md:col-span-2">
            <USelectMenu
              v-model="planState.supervisorIds"
              :items="availableSupervisors"
              label-key="fullName"
              value-key="id"
              multiple
              placeholder="Select supervisors to manage this plan..."
              searchable
              :loading="loadingUsers"
              class="w-full"
            />
          </UFormField>
        </UForm>

        <div class="flex justify-end">
          <UButton :disabled="!planState.departmentId" @click="step++">Next: Add Tasks</UButton>
        </div>
      </div>

      <!-- Step 2: Tasks -->
      <div v-else-if="step === 2" class="space-y-6">
        <div class="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h3 class="font-bold font-heading">Quick Add Task</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UFormField label="Task Name" class="md:col-span-2">
              <UInput v-model="currentTask.taskName" placeholder="Task Name" />
            </UFormField>

            <UFormField label="Type">
              <USelect v-model="currentTask.taskType" :items="['PROJECT', 'ROUTINE']" />
            </UFormField>

            <UFormField label="Assigned Officer" class="md:col-span-2">
              <USelectMenu
                v-model="currentTask.assignedToId"
                :items="availableOfficers"
                label-key="fullName"
                value-key="id"
                placeholder="Unassigned (Supervisor will assign later)"
                searchable
                clearable
                class="w-full"
                :loading="loadingUsers"
              />
            </UFormField>

            <UFormField label="Priority">
              <USelect v-model="currentTask.priority" :items="['LOW', 'MEDIUM', 'HIGH', 'URGENT']" />
            </UFormField>

            <!-- Conditional Fields for Project -->
            <template v-if="currentTask.taskType === 'PROJECT'">
              <UFormField label="Planned Start">
                <UInput v-model="currentTask.plannedStart" type="date" />
              </UFormField>
              <UFormField label="Planned End">
                <UInput v-model="currentTask.plannedEnd" type="date" />
              </UFormField>
            </template>

            <!-- Conditional Fields for Routine -->
            <template v-else>
              <UFormField label="Frequency">
                <USelect v-model="currentTask.recurrenceType" :items="['DAILY', 'WEEKLY', 'MONTHLY']" />
              </UFormField>
              <UFormField label="Valid From">
                <UInput v-model="currentTask.recurrenceStart" type="date" />
              </UFormField>
              <UFormField label="Valid Until">
                <UInput v-model="currentTask.recurrenceEnd" type="date" />
              </UFormField>
            </template>

            <div class="md:col-span-3">
              <UButton icon="i-heroicons-plus" color="neutral" block @click="addTask" :disabled="!currentTask.taskName">Add to List</UButton>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <h3 class="font-bold">Pending Tasks ({{ tasks.length }})</h3>
          <p v-if="tasks.length === 0" class="text-sm text-neutral-500 italic">No tasks added yet. You can add tasks later or assign a supervisor to do it.</p>
          <div v-for="(t, i) in tasks" :key="i" class="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
            <div>
              <p class="font-medium">{{ t.taskName }}</p>
              <p class="text-xs text-neutral-500">
                Type: {{ t.taskType }} •
                Assigned: {{ users.find(u => u.id === t.assignedToId)?.fullName || 'Not assigned' }} •
                Priority: {{ t.priority }}
              </p>
            </div>
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" @click="removeTask(i)" />
          </div>
        </div>

        <div class="flex justify-between">
          <UButton variant="ghost" color="neutral" @click="step--">Back</UButton>
          <UButton @click="step++">Next: Review</UButton>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div v-else class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <UCard class="bg-neutral-50 dark:bg-neutral-900 border-none">
              <p class="text-xs text-neutral-500 uppercase font-bold mb-1">Plan Title</p>
              <p class="font-bold">{{ planState.title }}</p>
           </UCard>
           <UCard class="bg-neutral-50 dark:bg-neutral-900 border-none">
              <p class="text-xs text-neutral-500 uppercase font-bold mb-1">Year</p>
              <p class="font-bold">{{ planState.year }}</p>
           </UCard>
            <UCard class="bg-neutral-50 dark:bg-neutral-900 border-none md:col-span-2">
              <p class="text-xs text-neutral-500 uppercase font-bold mb-1">Department</p>
              <p class="font-bold text-primary">{{ selectedDepartmentName }}</p>
            </UCard>
            <UCard class="bg-neutral-50 dark:bg-neutral-900 border-none md:col-span-2" v-if="planState.supervisorIds.length > 0">
              <p class="text-xs text-neutral-500 uppercase font-bold mb-1">Assigned Supervisors</p>
              <div class="flex flex-wrap gap-2 mt-1">
                <UBadge v-for="sid in planState.supervisorIds" :key="sid" color="primary" variant="soft">
                  {{ users.find(u => u.id === sid)?.fullName || sid }}
                </UBadge>
              </div>
            </UCard>
        </div>

        <div>
          <h3 class="font-bold mb-4">Task List Summary</h3>
          <UTable
            v-if="tasks.length > 0"
            :data="tasks"
            :columns="[
              { accessorKey: 'taskName', header: 'Task' },
              { accessorKey: 'taskType', header: 'Type' },
              {
                id: 'assignedTo',
                header: 'Assigned Officer',
                cell: ({ row }) => {
                  const u = users.find(u => u.id === row.original.assignedToId)
                  return u ? u.fullName : h('span', { class: 'text-neutral-400 italic' }, 'Not assigned')
                }
              },
              { accessorKey: 'priority', header: 'Priority' }
            ]"
          />
          <div v-else class="text-center py-8 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
            <p class="text-sm text-neutral-500 font-medium">No initial tasks created.</p>
            <p class="text-xs text-neutral-400 mt-1">Supervisors will be able to add tasks after the plan is created.</p>
          </div>
        </div>

        <div class="flex justify-between">
          <UButton variant="ghost" color="neutral" @click="step--">Back</UButton>
          <UButton color="success" block class="max-w-xs ml-auto font-bold" @click="submitAll">Create Plan & Tasks</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
