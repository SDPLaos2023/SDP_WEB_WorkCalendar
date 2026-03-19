import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'
import { paginate } from '../../../../utils/pagination'
import { calculateCompliance } from '../../../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
        }

        // 1. Fetch Task and verify access
        const task = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                workPlan: { include: { department: true } }
            }
        })

        if (!task) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found' })
        }

        // 2. Authorization Scoping
        const isSuperAdmin = user.role === 'SUPER_ADMIN'
        const isAdminCompany = user.role === 'ADMIN_COMPANY' && user.companyId === task.workPlan.department.companyId
        const isManager = user.role === 'MANAGER' && user.departmentId === task.workPlan.departmentId
        const isAssignedOfficer = user.role === 'OFFICER' && task.assignedToId === user.id

        if (!isSuperAdmin && !isAdminCompany && !isManager && !isAssignedOfficer) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to this task' })
        }

        // 3. Extract Filters
        const query = getQuery(event)
        const from = query.from ? new Date(query.from as string) : undefined
        const to = query.to ? new Date(query.to as string) : undefined
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 30

        const where: any = {
            planTaskId: taskId
        }

        if (from || to) {
            where.actualDate = {
                ...(from && { gte: from }),
                ...(to && { lte: to })
            }
        }

        // 4. Paginate
        const result = await paginate(prisma.taskActual, {
            page,
            pageSize: limit,
            where,
            orderBy: { actualDate: 'desc' },
            include: { updatedBy: { select: { id: true, firstName: true, lastName: true } } }
        })

        // 5. Compliance Summary for ROUTINE tasks
        let complianceSummary = null
        if (task.taskType === 'ROUTINE') {
            // Need all actuals for compliance calculation
            const allActuals = await prisma.taskActual.findMany({
                where: { planTaskId: taskId },
                select: { actualDate: true }
            })
            complianceSummary = calculateCompliance(task, allActuals)
        }

        return {
            success: true,
            ...result,
            ...(complianceSummary && { complianceSummary })
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_TASK_ACTUALS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
