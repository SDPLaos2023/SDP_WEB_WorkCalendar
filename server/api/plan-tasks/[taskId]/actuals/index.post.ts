import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'
import { createActualSchema } from '~~/shared/schemas/task-actual.schema'
import { updateTaskMaterializedStats } from '../../../../utils/materialized-stats'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
        }

        // 1. Fetch Task and verify assignedToId
        const task = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null }
        })

        if (!task) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found' })
        }

        if (task.assignedToId !== user.id) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You are not assigned to this task' })
        }

        // 2. Validate Body
        const body = await readBody(event)
        const result = createActualSchema.safeParse(body)
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const actualData = result.data
        const actualDate = new Date(actualData.actualDate)

        // 3. ROUTINE uniqueness check
        if (task.taskType === 'ROUTINE') {
            const existing = await prisma.taskActual.findFirst({
                where: {
                    planTaskId: taskId,
                    actualDate: actualDate
                }
            })

            if (existing) {
                throw createError({
                    statusCode: 409,
                    statusMessage: 'Already updated for this period'
                })
            }
        }

        // 4. Create TaskActual within a transaction to handle auto-status update
        const createdActual = await prisma.$transaction(async (tx) => {
            // A. Create Actual
            const actual = await tx.taskActual.create({
                data: {
                    planTaskId: taskId,
                    updatedById: user.id,
                    updateType: actualData.updateType,
                    actualDate,
                    actualStart: actualData.actualStart ? new Date(actualData.actualStart) : null,
                    actualEnd: actualData.actualEnd ? new Date(actualData.actualEnd) : null,
                    actualDays: actualData.actualDays || null,
                    completionPct: actualData.completionPct,
                    status: actualData.status,
                    note: actualData.note,
                    attachmentUrl: actualData.attachmentUrl
                }
            })

            // B. If completionPct = 100, auto-set task status to DONE
            if (actualData.completionPct === 100) {
                await tx.planTask.update({
                    where: { id: taskId },
                    data: { status: 'COMPLETED' } // Assuming COMPLETED from shared schemas/DB logic
                })
            } else if (task.status === 'PENDING') {
                 // Any update shifts it from pending
                await tx.planTask.update({
                    where: { id: taskId },
                    data: { status: 'IN_PROGRESS' }
                })
            }

            // C. Update Materialized Stats
            await updateTaskMaterializedStats(taskId, tx)

            return actual
        })

        // 5. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'TaskActual',
            recordId: createdActual.id,
            newValues: createdActual
        })

        return {
            success: true,
            data: createdActual
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_TASK_ACTUAL_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
