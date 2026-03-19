import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing plan ID' })
        }

        // 1. Fetch Old Plan
        const oldPlan = await prisma.workPlan.findFirst({
            where: { id, deletedAt: null },
            include: { department: true }
        })

        if (!oldPlan) {
            throw createError({ statusCode: 404, statusMessage: 'Work plan not found' })
        }

        // 2. Authorization
        if (user.role === 'MANAGER' && oldPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You can only delete plans for your own department' })
        }
        if (user.role === 'ADMIN_COMPANY' && oldPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company work plan' })
        }

        // 3. Update Plan (Soft Delete)
        const deletedPlan = await prisma.workPlan.update({
            where: { id },
            data: {
                deletedAt: new Date()
            }
        })

        // 4. Audit Log
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'WorkPlan',
            recordId: deletedPlan.id,
            oldValues: oldPlan,
            newValues: deletedPlan
        })

        // 5. Response
        return {
            success: true,
            data: deletedPlan
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DELETE_WORK_PLAN_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
