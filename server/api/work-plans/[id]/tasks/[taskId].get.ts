import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
        }

        // 1. Fetch Task
        const task = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true, email: true, role: true }
                },
                workPlan: {
                    include: { department: true }
                },
                actuals: {
                    orderBy: { actualDate: 'desc' },
                    take: 5
                }
            }
        })

        if (!task) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found' })
        }

        // 2. Authorization: Same company only
        if (user.role !== 'SUPER_ADMIN' && task.workPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company task' })
        }

        return {
            success: true,
            data: task
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_TASK_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
