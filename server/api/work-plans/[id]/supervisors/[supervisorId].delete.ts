import { prisma } from '../../../../utils/prisma'
import { requireRole } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])
        const workPlanId = event.context.params?.id
        const supervisorId = event.context.params?.supervisorId

        if (!workPlanId || !supervisorId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })
        }

        // 1. Fetch Work Plan
        const workPlan = await prisma.workPlan.findFirst({
            where: { id: workPlanId, deletedAt: null } as any,
            include: { department: true }
        }) as any

        if (!workPlan) {
            throw createError({ statusCode: 404, statusMessage: 'Work plan not found' })
        }

        if (user.role === 'MANAGER' && workPlan.departmentId !== user.departmentId) {
             throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot edit plans outside your department' })
        }

        // 2. Remove assignment
        const assignment = await prisma.workPlanSupervisor.findUnique({
            where: {
                // Since our unique constraint is @@unique([workPlanId, supervisorId]), Prisma automatically creates a unique identifier block
                workPlanId_supervisorId: {
                    workPlanId,
                    supervisorId
                }
            } as any
        })

        if (!assignment) {
            throw createError({ statusCode: 404, statusMessage: 'Supervisor not assigned to this plan' })
        }

        await prisma.workPlanSupervisor.delete({
            where: { id: assignment.id }
        })

        logAudit({
            event,
            action: 'DELETE',
            tableName: 'WorkPlanSupervisor',
            recordId: assignment.id,
            oldValues: assignment
        } as any)

        return { success: true }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[REMOVE_SUPERVISOR_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
