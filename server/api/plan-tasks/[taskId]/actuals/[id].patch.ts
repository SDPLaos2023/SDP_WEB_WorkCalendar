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

        // 1. Fetch TaskActual with Task and Plan to check permissions
        const oldActual = await prisma.taskActual.findFirst({
            where: { id, planTaskId: taskId },
            include: {
                planTask: {
                    include: {
                        workPlan: {
                            include: {
                                supervisors: true
                            }
                        }
                    }
                }
            }
        })

        if (!oldActual) {
            throw createError({ statusCode: 404, statusMessage: 'Update record not found' })
        }

        // 2. Authorization & Backdating Logic
        const task = oldActual.planTask
        const isAssignedPerson = task.assignedToId === user.id
        const isSuperAdmin = user.role === 'SUPER_ADMIN'
        const isCompanyAdmin = user.role === 'ADMIN_COMPANY' && user.companyId === task.workPlan.departmentId.split('-')[0]
        const isManagerOfDept = user.role === 'MANAGER' && user.departmentId === task.workPlan.departmentId
        const isSupervisorOfPlan = task.workPlan.supervisors.some(s => s.supervisorId === user.id) || task.supervisorId === user.id

        const isBoss = isSuperAdmin || isCompanyAdmin || isManagerOfDept || isSupervisorOfPlan

        // Basic permission check: Owner or Boss
        if (oldActual.updatedById !== user.id && !isBoss) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You do not have permission to edit this update' })
        }

        // 3. Validate Body
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

        // 4. Date Formatting & Hierarchy Restriction
        const todayStr = new Date().toLocaleDateString('en-CA') 
        const todayAddress = new Date(`${todayStr}T00:00:00Z`)

        if (updates.actualDate) {
            // Force UTC midnight for SQL Server DATE column
            const newDate = new Date(`${updates.actualDate}T00:00:00Z`)
            const isBackdated = newDate < todayAddress
            const isFuture = newDate > todayAddress

            // No future updates
            if (isFuture) throw createError({ statusCode: 400, statusMessage: 'tasks.error_future_date' })

            // Only boss can backdate (or edit backdated records that aren't theirs)
            if (isBackdated && !isBoss) {
                throw createError({ statusCode: 403, statusMessage: 'tasks.error_backdate_forbidden' })
            }

            updates.actualDate = newDate
        }

        if (updates.actualStart) updates.actualStart = new Date(`${updates.actualStart}T00:00:00Z`)
        if (updates.actualEnd) updates.actualEnd = new Date(`${updates.actualEnd}T00:00:00Z`)

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
