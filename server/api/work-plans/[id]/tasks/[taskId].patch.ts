import { prisma } from '../../../../utils/prisma'
import { requireRole } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'
import { updatePlanTaskSchema } from '../../../../../shared/schemas/plan-task.schema'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR', 'OFFICER'])
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'common.error_missing_id' })
        }

        // 1. Fetch Old Task
        const oldTask = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: { workPlan: { include: { department: true, supervisors: true } } }
        })

        if (!oldTask) {
            throw createError({ statusCode: 404, statusMessage: 'common.error_not_found' })
        }

        // 2. Authorization
        if (user.role === 'SUPERVISOR') {
            const isAssigned = (oldTask.workPlan as any).supervisors.some((s: any) => s.supervisorId === user.id)
            if (!isAssigned) {
                throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
            }
        } else if (user.role === 'MANAGER' && oldTask.workPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        } else if (user.role === 'OFFICER' && oldTask.workPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        } else if (user.role === 'ADMIN_COMPANY' && oldTask.workPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        }

        // 3. Validate Body
        const body = await readBody(event)
        const result = updatePlanTaskSchema.safeParse(body)
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'common.error_validation',
                data: result.error.flatten().fieldErrors
            })
        }

        const updates: any = { ...result.data }

        // 4. Handle PROJECT specific logic (plannedDays)
        if (oldTask.taskType === 'PROJECT') {
            const startStr = updates.plannedStart || (oldTask.plannedStart instanceof Date ? oldTask.plannedStart.toISOString().split('T')[0] : oldTask.plannedStart)
            const endStr = updates.plannedEnd || (oldTask.plannedEnd instanceof Date ? oldTask.plannedEnd.toISOString().split('T')[0] : oldTask.plannedEnd)

            const start = startStr ? new Date(`${startStr}T00:00:00Z`) : null
            const end = endStr ? new Date(`${endStr}T00:00:00Z`) : null

            if (start && end) {
                const diffMs = end.getTime() - start.getTime()
                updates.plannedDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
                updates.plannedStart = start
                updates.plannedEnd = end
            }
        } else {
            // For ROUTINE
            if (updates.recurrenceStart) updates.recurrenceStart = new Date(`${updates.recurrenceStart}T00:00:00Z`)
            if (updates.recurrenceEnd) updates.recurrenceEnd = new Date(`${updates.recurrenceEnd}T00:00:00Z`)
        }

        // 5. Update Task
        const updatedTask = await prisma.planTask.update({
            where: { id: taskId },
            data: updates
        })

        // 6. Audit Log
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'PlanTask',
            recordId: updatedTask.id,
            oldValues: oldTask,
            newValues: updatedTask
        })

        return {
            success: true,
            data: updatedTask
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_TASK_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'common.error_internal' })
    }
})
