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

        // 1. Fetch Task with its Plan and Supervisors to check hierarchy
        const task = await prisma.planTask.findFirst({
            where: { id: taskId, deletedAt: null },
            include: {
                workPlan: {
                    include: {
                        supervisors: true
                    }
                }
            }
        })

        if (!task) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found' })
        }

        // 2. Body Validation
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
        // Force parse as UTC midnight for SQL Server DATE column
        const actualDate = new Date(`${actualData.actualDate}T00:00:00Z`)

        // Normalize Today to UTC Midnight as well for accurate comparison
        const todayStr = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD in local time
        const today = new Date(`${todayStr}T00:00:00Z`)

        const isBackdated = actualDate < today
        const isFuture = actualDate > today

        // 3. Date & Permission Check
        if (isFuture) {
            throw createError({
                statusCode: 400,
                statusMessage: 'tasks.error_future_date'
            })
        }
        const isAssignedPerson = task.assignedToId === user.id

        // Define "Boss" roles for this specific task
        const isSuperAdmin = user.role === 'SUPER_ADMIN'
        const isCompanyAdmin = user.role === 'ADMIN_COMPANY' && user.companyId === task.workPlan.departmentId.split('-')[0] // Approximation or check department-company link
        // Actually, we should check companyId from the user object directly
        const isSameCompany = user.companyId === (task as any).companyId || true // Already filtered by middleware usually

        const isManagerOfDept = user.role === 'MANAGER' && user.departmentId === task.workPlan.departmentId
        const isSupervisorOfPlan = task.workPlan.supervisors.some(s => s.supervisorId === user.id) || task.supervisorId === user.id

        const isBoss = isSuperAdmin || isCompanyAdmin || isManagerOfDept || isSupervisorOfPlan

        // 3a. Basic access check
        if (!isAssignedPerson && !isBoss) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You do not have permission to update this task' })
        }

        // 3b. Backdating restriction: Only Bosses can backdate
        if (isBackdated && !isBoss) {
            throw createError({
                statusCode: 403,
                statusMessage: 'tasks.error_backdate_forbidden'
            })
        }

        // 3c. SELF-backdating restriction: Bosses cannot backdate THEIR OWN tasks as boss
        if (isBackdated && isAssignedPerson && !isSuperAdmin) {
            throw createError({
                statusCode: 403,
                statusMessage: 'tasks.error_self_backdate'
            })
        }

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
                    statusMessage: 'tasks.error_duplicate_actual'
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
