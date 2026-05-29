import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

type PeriodType = 'MONTHLY' | 'YEARLY'
type UserRole = 'SUPER_ADMIN' | 'ADMIN_COMPANY' | 'MANAGER' | 'SUPERVISOR' | 'OFFICER'

type AuthUser = {
    id: string
    role: UserRole
    companyId?: string
    departmentId?: string
}

type QueryPrimitive = string | number | boolean | null | undefined
type QueryValue = QueryPrimitive | QueryPrimitive[]

type ActualRecord = {
    actualDate: Date
    completionPct?: unknown
    updateType?: string
    status?: string
    note?: string | null
    attachmentUrl?: string | null
    updatedBy?: {
        firstName: string
        lastName: string
    }
}

type ReportTask = {
    id: string
    taskName: string
    taskType: string
    status: string
    recurrenceType: string | null
    recurrenceStart: Date | null
    recurrenceEnd: Date | null
    recurrenceDay: number | null
    actuals: ActualRecord[]
}

type ReportPlan = {
    id: string
    title: string
    year: number
    status: string
    department?: { name: string } | null
    tasks: ReportTask[]
}

type DateRange = {
    gte: Date
    lt: Date
}

type WorkPlanWhere = {
    id?: string
    deletedAt: null
    year: number
    departmentId?: string
    department?: { companyId: string }
    supervisors?: { some: { supervisorId: string } }
    tasks?: { some: { assignedToId: string } }
}

const toStringValue = (value: QueryValue): string | undefined => {
    if (Array.isArray(value)) {
        const first = value[0]
        return first === null || first === undefined ? undefined : String(first)
    }

    return value === null || value === undefined ? undefined : String(value)
}

const parseYear = (value: QueryValue): number => {
    const parsed = Number.parseInt(toStringValue(value) || '', 10)
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear()
}

const parseMonth = (value: QueryValue): number => {
    const parsed = Number.parseInt(toStringValue(value) || '', 10)
    if (!Number.isFinite(parsed)) return new Date().getMonth() + 1
    return Math.min(Math.max(parsed, 1), 12)
}

const parsePeriodType = (value: QueryValue): PeriodType => (
    toStringValue(value) === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
)

const roundPct = (value: number): number => Math.round(value * 100) / 100

const dateRangeForPeriod = (year: number, month: number, period: PeriodType): DateRange => {
    if (period === 'YEARLY') {
        return {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1)
        }
    }

    return {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
    }
}

const uniquePeriodUnits = (actuals: ActualRecord[], period: PeriodType): number => {
    const units = new Set<string>()

    for (const actual of actuals) {
        const date = new Date(actual.actualDate)
        const key = period === 'YEARLY'
            ? `${date.getFullYear()}-${date.getMonth()}`
            : date.toISOString().slice(0, 10)
        units.add(key)
    }

    return units.size
}

const latestCompletion = (task: ReportTask): number => {
    const latest = task.actuals[0]
    return Number(latest?.completionPct || 0)
}

const taskAchievement = (task: ReportTask): number => {
    if (task.taskType === 'PROJECT') {
        return latestCompletion(task)
    }

    const compliance = calculateCompliance(
        task,
        task.actuals.map(actual => ({
            ...actual,
            actualDate: new Date(actual.actualDate)
        }))
    )

    return compliance?.compliancePct || 0
}

const buildPlanWhere = (
    user: AuthUser,
    year: number,
    departmentId?: string,
    workPlanId?: string,
    companyId?: string
): WorkPlanWhere => {
    const where: WorkPlanWhere = {
        deletedAt: null,
        year
    }

    if (workPlanId) {
        where.id = workPlanId
    }

    if (user.role === 'SUPER_ADMIN') {
        if (companyId) where.department = { companyId }
    } else if (user.role === 'ADMIN_COMPANY' && user.companyId) {
        where.department = { companyId: user.companyId }
    } else if (user.role === 'MANAGER' && user.departmentId) {
        where.departmentId = user.departmentId
    } else if (user.role === 'SUPERVISOR') {
        where.supervisors = { some: { supervisorId: user.id } }
    } else if (user.role === 'OFFICER') {
        where.tasks = { some: { assignedToId: user.id } }
    }

    if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
        where.departmentId = departmentId
    }

    return where
}

const summarizePlan = (plan: ReportPlan, period: PeriodType) => {
    const actuals = plan.tasks.flatMap(task => task.actuals)
    const completedUnits = uniquePeriodUnits(actuals, period)
    const targetUnits = period === 'MONTHLY' ? 30 : 12
    const kpiPct = roundPct(Math.min((completedUnits / targetUnits) * 100, 100))

    let totalAchievement = 0
    const tasks = plan.tasks.map(task => {
        const actual = roundPct(taskAchievement(task))
        totalAchievement += actual

        return {
            id: task.id,
            name: task.taskName,
            type: task.taskType,
            actual,
            status: task.status,
            actualCount: task.actuals.length,
            latestUpdate: task.actuals[0]
                ? {
                    actualDate: task.actuals[0].actualDate.toISOString().split('T')[0],
                    updateType: task.actuals[0].updateType || '',
                    status: task.actuals[0].status || '',
                    completionPct: Number(task.actuals[0].completionPct || 0),
                    note: task.actuals[0].note || '',
                    attachmentUrl: task.actuals[0].attachmentUrl || '',
                    updatedBy: task.actuals[0].updatedBy
                        ? `${task.actuals[0].updatedBy.firstName} ${task.actuals[0].updatedBy.lastName}`
                        : ''
                }
                : null
        }
    })

    const achievementPct = plan.tasks.length > 0 ? roundPct(totalAchievement / plan.tasks.length) : 0

    return {
        completedUnits,
        targetUnits,
        kpiPct,
        achievementPct,
        tasks
    }
}

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event) as AuthUser
        const query = getQuery(event) as Record<string, QueryValue>
        const year = parseYear(query.year)
        const month = parseMonth(query.month)
        const period = parsePeriodType(query.period)
        const departmentId = toStringValue(query.departmentId)
        const workPlanId = toStringValue(query.workPlanId)
        const companyId = toStringValue(query.companyId)
        const actualDate = dateRangeForPeriod(year, month, period)

        const plans = await prisma.workPlan.findMany({
            where: buildPlanWhere(user, year, departmentId, workPlanId, companyId),
            include: {
                department: { select: { name: true } },
                tasks: {
                    where: { deletedAt: null },
                    include: {
                        actuals: {
                            where: {
                                deletedAt: null,
                                actualDate
                            },
                            orderBy: { actualDate: 'desc' },
                            include: {
                                updatedBy: {
                                    select: { firstName: true, lastName: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }) as ReportPlan[]

        const reportData = plans.map(plan => {
            const summary = summarizePlan(plan, period)

            return {
                id: plan.id,
                planName: plan.title,
                department: plan.department?.name || 'N/A',
                year: plan.year,
                status: plan.status,
                totalTasks: plan.tasks.length,
                completedUnits: summary.completedUnits,
                targetUnits: summary.targetUnits,
                unitLabel: period === 'MONTHLY' ? 'days' : 'months',
                period,
                achievementPct: summary.achievementPct,
                kpiPct: summary.kpiPct,
                tasks: summary.tasks
            }
        })

        return { success: true, data: reportData }
    } catch (error: unknown) {
        const statusError = error as { statusCode?: number }
        if (statusError.statusCode) throw error

        console.error('[KPI_REPORT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
