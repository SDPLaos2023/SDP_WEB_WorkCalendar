import { prisma } from '../../../utils/prisma'
import { requireRole } from '../../../utils/auth-helpers'
import { logAudit } from '../../../utils/audit'
import { statusTransitionSchema } from '../../../../shared/schemas/work-plan.schema'

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
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You can only update plans for your own department' })
        }
        if (user.role === 'ADMIN_COMPANY' && oldPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company work plan' })
        }

        // 3. Validate Body
        const body = await readBody(event)
        const result = statusTransitionSchema.safeParse(body)
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const newStatus = result.data.status

        // 4. Validate Transitions
        // DRAFT -> ACTIVE
        // ACTIVE -> CLOSED
        const currentStatus = oldPlan.status
        let isValidTransition = false

        if (currentStatus === 'DRAFT' && newStatus === 'ACTIVE') isValidTransition = true
        if (currentStatus === 'ACTIVE' && newStatus === 'CLOSED') isValidTransition = true

        if (!isValidTransition) {
            throw createError({
                statusCode: 400,
                statusMessage: `Invalid status transition from ${currentStatus} to ${newStatus}`
            })
        }

        // 5. Update Status
        const updatedPlan = await prisma.workPlan.update({
            where: { id },
            data: { status: newStatus }
        })

        // 6. Audit Log
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'WorkPlan',
            recordId: updatedPlan.id,
            oldValues: oldPlan,
            newValues: updatedPlan
        })

        // 7. Response
        return {
            success: true,
            data: updatedPlan
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_WORK_PLAN_STATUS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
