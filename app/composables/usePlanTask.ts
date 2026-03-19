import type { CreatePlanTaskInput, UpdatePlanTaskInput } from '~~/shared/schemas/plan-task.schema'
import { useAuth } from './useAuth'

export interface PlanTask {
  id: string
  workPlanId: string
  assignedToId: string
  createdById: string
  taskName: string
  description?: string | null
  taskType: 'PROJECT' | 'ROUTINE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  plannedStart?: string
  plannedEnd?: string
  plannedDays?: number
  isRecurring: boolean
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  recurrenceDay?: number | null
  recurrenceStart?: string
  recurrenceEnd?: string
  assignedTo?: { id: string; firstName: string; lastName: string }
  workPlan?: { id: string; title: string; status: string }
  _count?: { actuals: number }
}

export const usePlanTask = () => {
  const { apiFetch } = useAuth()
  const tasks = useState<PlanTask[]>('plan-tasks', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchTasks = async (planId: string, params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${planId}/tasks`, { params })
      if (response && response.success) {
        tasks.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch tasks'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMyTasks = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/plan-tasks/my-tasks')
      if (response && response.success) {
        tasks.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch your tasks'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchById = async (planId: string, taskId: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${planId}/tasks/${taskId}`)
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (planId: string, data: CreatePlanTaskInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${planId}/tasks`, {
        method: 'POST',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to create task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (planId: string, taskId: string, data: UpdatePlanTaskInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${planId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to update task'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (planId: string, taskId: string) => {
    loading.value = true
    error.value = null
    try {
      await apiFetch(`/api/work-plans/${planId}/tasks/${taskId}`, {
        method: 'DELETE'
      })
      tasks.value = tasks.value.filter(t => t.id !== taskId)
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to delete task'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    fetchMyTasks,
    fetchById,
    create,
    update,
    remove
  }
}
