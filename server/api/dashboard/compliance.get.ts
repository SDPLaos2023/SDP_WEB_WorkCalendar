import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined
        const taskId = (query.taskId as string) || undefined

        // 1. Build Scoping Filters
        const taskWhere: any = {
            deletedAt: null,
            taskType: 'ROUTINE',
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

        // Apply external filters if provided
        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            taskWhere.workPlan.departmentId = departmentId
        }
        if (taskId) {
            taskWhere.id = taskId
        }

        // 2. Fetch Routine Tasks and Actuals
        const routines = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true }
                },
                actuals: {
                    orderBy: { actualDate: 'desc' }
                }
            }
        })

        // 3. Process Compliance
        const complianceResults = routines.map(task => {
            const compliance = calculateCompliance(task, task.actuals)
            return {
                taskId: task.id,
                taskName: task.taskName,
                assignedTo: task.assignedTo,
                recurrenceType: task.recurrenceType,
                expectedPeriods: compliance?.expectedPeriods || 0,
                completedPeriods: compliance?.completedPeriods || 0,
                compliancePct: compliance?.compliancePct || 0,
                missedDates: compliance?.missedDates || []
            }
        })

        return {
            success: true,
            data: complianceResults
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DASHBOARD_COMPLIANCE_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
