import { useAuth } from './useAuth';

export interface DashboardSummary {
  totalPlans: number
  activePlans: number
  totalTasks: { project: number; routine: number }
  projectAvgCompletion: number
  routineComplianceAvg: number
  missedToday: number
  updatesToday: number
  statusBreakdown: {
    DONE: number
    IN_PROGRESS: number
    PENDING: number
    CANCELLED: number
  }
  topDepartments: { name: string; score: number }[]
  trend: { date: string; count: number }[]
}

export interface ComplianceItem {
  taskId: string
  taskName: string
  assignedTo: { id: string; firstName: string; lastName: string }
  recurrenceType: string
  expectedPeriods: number
  completedPeriods: number
  compliancePct: number
  missedDates: string[]
}

export interface ProgressItem {
  taskId: string
  taskName: string
  assignedTo: { id: string; firstName: string; lastName: string }
  priority: string
  status: string
  plannedStart: string
  plannedEnd: string
  plannedDays: number
  latestActual: {
    completionPct: number
    status: string
    actualDate: string
    note?: string | null
  } | null
}

export const useDashboard = () => {
  const { apiFetch } = useAuth()
  const summary = useState<DashboardSummary | null>('dashboard-summary', () => null)
  const compliance = useState<ComplianceItem[]>('dashboard-compliance', () => [])
  const progress = useState<ProgressItem[]>('dashboard-progress', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSummary = async (params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/dashboard/summary', { params })
      if (response && response.success) {
        summary.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch summary'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchCompliance = async (params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/dashboard/compliance', { params })
      if (response && response.success) {
        compliance.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch compliance'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchProgress = async (params?: any) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiFetch<any>('/api/dashboard/progress', { params })
      if (response && response.success) {
        progress.value = response.data
      }
      return response?.data
    } catch (err: any) {
      error.value = err.data?.statusMessage || 'Failed to fetch progress'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    compliance,
    progress,
    loading,
    error,
    fetchSummary,
    fetchCompliance,
    fetchProgress
  }
}
