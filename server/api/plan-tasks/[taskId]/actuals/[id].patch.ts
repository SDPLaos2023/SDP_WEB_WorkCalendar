import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'
import { updateActualSchema } from '~~/shared/schemas/task-actual.schema'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const taskId = event.context.params?.taskId
        const id = event.context.params?.id

        if (!taskId || !id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })
        }

        // 1. Fetch TaskActual
        const oldActual = await prisma.taskActual.findFirst({
            where: { id, planTaskId: taskId }
        })

        if (!oldActual) {
            throw createError({ statusCode: 404, statusMessage: 'Update record not found' })
        }

        // 2. Authorization: Own record only
        if (oldActual.updatedById !== user.id) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You can only edit your own updates' })
        }

        // 3. Date Constraint: Same day only
        const createdAt = new Date(oldActual.createdAt)
        const today = new Date()

        const isSameDay =
            createdAt.getFullYear() === today.getFullYear() &&
            createdAt.getMonth() === today.getMonth() &&
            createdAt.getDate() === today.getDate()

        if (!isSameDay) {
            throw createError({ statusCode: 403, statusMessage: "Forbidden: Can only edit today's update" })
        }

        // 4. Validate Body
        const body = await readBody(event)
        const result = updateActualSchema.safeParse(body)
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const updates: any = { ...result.data }

        // Convert dates if present
        if (updates.actualDate) updates.actualDate = new Date(updates.actualDate)
        if (updates.actualStart) updates.actualStart = new Date(updates.actualStart)
        if (updates.actualEnd) updates.actualEnd = new Date(updates.actualEnd)

        // 5. Update Actual
        const updatedActual = await prisma.taskActual.update({
            where: { id },
            data: updates
        })

        // 6. Audit Log
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'TaskActual',
            recordId: updatedActual.id,
            oldValues: oldActual,
            newValues: updatedActual
        })

        return {
            success: true,
            data: updatedActual
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_TASK_ACTUAL_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
