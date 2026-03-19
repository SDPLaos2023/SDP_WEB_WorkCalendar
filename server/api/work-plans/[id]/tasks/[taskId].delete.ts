import { prisma } from '../../../../utils/prisma'
import { requireRole } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR'])
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
        }

        // 1. Fetch Old Task
        const oldTask = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: { workPlan: { include: { department: true, supervisors: true } } }
        })

        if (!oldTask) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found' })
        }

        // 2. Authorization
        if (user.role === 'SUPERVISOR') {
            const isAssigned = (oldTask.workPlan as any).supervisors.some((s: any) => s.supervisorId === user.id)
            if (!isAssigned) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You are not assigned to this work plan' })
            }
        } else if (user.role === 'MANAGER' && oldTask.workPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You can only delete tasks for your own department' })
        } else if (user.role === 'ADMIN_COMPANY' && oldTask.workPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company task' })
        }

        // 3. Update Task (Soft Delete)
        const deletedTask = await prisma.planTask.update({
            where: { id: taskId },
            data: {
                deletedAt: new Date(),
                status: 'CANCELLED'
            }
        })

        // 4. Audit Log
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'PlanTask',
            recordId: deletedTask.id,
            oldValues: oldTask,
            newValues: deletedTask
        })

        return {
            success: true,
            data: deletedTask
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DELETE_TASK_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
