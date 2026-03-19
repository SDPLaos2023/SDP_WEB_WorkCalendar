import type { CreateWorkPlanInput, UpdateWorkPlanInput } from '~~/shared/schemas/work-plan.schema'
import { useAuth } from './useAuth'

export interface WorkPlan {
  id: string
  departmentId: string
  createdById: string
  title: string
  description?: string | null
  year: number
  planStartDate: string
  planEndDate: string
  totalDays: number
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  department?: { name: string }
  supervisors?: any[]
  _count?: { tasks: number }
}

export const useWorkPlan = () => {
  const { apiFetch } = useAuth()
  const plans = useState<WorkPlan[]>('work-plans', () => [])
  const current = useState<WorkPlan | null>('current-work-plan', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPlans = async (params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/work-plans', { params })
      if (response && response.success) {
        plans.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch work plans'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${id}`)
      if (response && response.success) {
        current.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch work plan'
      throw err
    } finally {
      loading.value = false
    }
  }

  const create = async (data: CreateWorkPlanInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/work-plans', {
        method: 'POST',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to create work plan'
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, data: UpdateWorkPlanInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${id}`, {
        method: 'PATCH',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to update work plan'
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await apiFetch(`/api/work-plans/${id}`, {
        method: 'DELETE'
      })
      plans.value = plans.value.filter(p => p.id !== id)
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to delete work plan'
      throw err
    } finally {
      loading.value = false
    }
  }

  const changeStatus = async (id: string, status: 'ACTIVE' | 'CLOSED') => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/work-plans/${id}/status`, {
        method: 'PATCH',
        body: { status }
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to change status'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    plans,
    current,
    loading,
    error,
    fetchPlans,
    fetchById,
    create,
    update,
    remove,
    changeStatus
  }
}
