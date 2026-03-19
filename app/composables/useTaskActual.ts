import type { CreateActualInput, UpdateActualInput } from '~~/shared/schemas/task-actual.schema'
import type { ComplianceSummary } from '~~/server/utils/compliance'
import { useAuth } from './useAuth'

export interface TaskActual {
  id: string
  planTaskId: string
  updatedById: string
  updateType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  actualDate: string
  actualStart?: string | null
  actualEnd?: string | null
  actualDays?: number | null
  completionPct: number
  status: 'DONE' | 'PARTIAL' | 'NOT_DONE'
  note?: string | null
  attachmentUrl?: string | null
  createdAt: string
  updatedBy?: { id: string; firstName: string; lastName: string }
}

export const useTaskActual = () => {
  const { apiFetch } = useAuth()
  const actuals = useState<TaskActual[]>('task-actuals', () => [])
  const compliance = useState<ComplianceSummary | null>('task-compliance', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchActuals = async (taskId: string, params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/plan-tasks/${taskId}/actuals`, { params })
      if (response && response.success) {
        actuals.value = response.data
        if (response.complianceSummary) {
          compliance.value = response.complianceSummary
        }
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch actual updates'
      throw err
    } finally {
      loading.value = false
    }
  }

  const submit = async (taskId: string, data: CreateActualInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/plan-tasks/${taskId}/actuals`, {
        method: 'POST',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to submit update'
      throw err
    } finally {
      loading.value = false
    }
  }

  const edit = async (taskId: string, actualId: string, data: UpdateActualInput) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>(`/api/plan-tasks/${taskId}/actuals/${actualId}`, {
        method: 'PATCH',
        body: data
      })
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to edit update'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    actuals,
    compliance,
    loading,
    error,
    fetchActuals,
    submit,
    edit
  }
}
