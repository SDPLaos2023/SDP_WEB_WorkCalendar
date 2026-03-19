import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined
        const status = (query.status as string) || undefined

        // 1. Build Scoping Filters
        const taskWhere: any = {
            deletedAt: null,
            taskType: 'PROJECT',
            workPlan: { deletedAt: null, year }
        }

        if (user.role === 'SUPER_ADMIN') {
            const filterCompanyId = query.companyId as string
            if (filterCompanyId) {
                taskWhere.workPlan.department = { companyId: filterCompanyId }
            }
        } else if (user.role === 'ADMIN_COMPANY') {
            taskWhere.workPlan.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            taskWhere.workPlan.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            taskWhere.workPlan.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            taskWhere.assignedToId = user.id
        }

        // Apply external filters
        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            taskWhere.workPlan.departmentId = departmentId
        }
        if (status) {
            taskWhere.status = status
        }

        // 2. Fetch Project Tasks and Latest Actual
        const projects = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true }
                },
                actuals: {
                    orderBy: { actualDate: 'desc' },
                    take: 1
                }
            }
        })

        // 3. Format Response
        const progressResults = projects.map(task => {
            const latest = task.actuals[0] || null
            return {
                taskId: task.id,
                taskName: task.taskName,
                assignedTo: task.assignedTo,
                priority: task.priority,
                status: task.status,
                plannedStart: task.plannedStart,
                plannedEnd: task.plannedEnd,
                plannedDays: task.plannedDays,
                latestActual: latest ? {
                    completionPct: latest.completionPct,
                    status: latest.status,
                    actualDate: latest.actualDate,
                    note: latest.note
                } : null
            }
        })

        return {
            success: true,
            data: progressResults
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DASHBOARD_PROGRESS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
