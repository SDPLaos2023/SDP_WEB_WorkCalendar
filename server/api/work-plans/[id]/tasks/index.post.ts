import { prisma } from '../../../../utils/prisma'
import { requireRole } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'
import { createPlanTaskSchema } from '../../../../../shared/schemas/plan-task.schema'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR', 'OFFICER'])
        const workPlanId = event.context.params?.id

        if (!workPlanId) {
            throw createError({ statusCode: 400, statusMessage: 'common.error_missing_id' })
        }

        // 1. Fetch Work Plan and verify access
        const workPlan = await prisma.workPlan.findFirst({
            where: { id: workPlanId, deletedAt: null },
            include: { department: true, supervisors: true }
        })

        if (!workPlan) {
            throw createError({ statusCode: 404, statusMessage: 'common.error_not_found' })
        }

        if (user.role === 'SUPERVISOR') {
            const isAssigned = (workPlan as any).supervisors.some((s: any) => s.supervisorId === user.id)
            if (!isAssigned) {
                throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
            }
        } else if (user.role === 'MANAGER' && workPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        } else if (user.role === 'OFFICER' && workPlan.departmentId !== user.departmentId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        } else if (user.role === 'ADMIN_COMPANY' && workPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'common.error_forbidden' })
        }

        // 2. Validate Body
        const body = await readBody(event)
        const result = createPlanTaskSchema.safeParse(body)
        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'common.error_validation',
                data: result.error.flatten().fieldErrors
            })
        }

        const taskData = result.data

        // 3. Verify assignedToId (Optional)
        if (taskData.assignedToId) {
            const assignedUser = await prisma.user.findFirst({
                where: {
                    id: taskData.assignedToId,
                    role: { in: ['MANAGER', 'SUPERVISOR', 'OFFICER'] },
                    departmentId: workPlan.departmentId,
                    deletedAt: null
                }
            })

            if (!assignedUser) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'tasks.error_invalid_assignment'
                })
            }
        }

        // 4. Prepare data for DB
        const createData: any = {
            workPlanId,
            supervisorId: taskData.supervisorId || (user.role === 'SUPERVISOR' ? user.id : null),
            assignedToId: taskData.assignedToId,
            createdById: user.id,
            taskName: taskData.taskName,
            description: taskData.description,
            taskType: taskData.taskType,
            priority: taskData.priority,
            status: 'PENDING'
        }

        if (taskData.taskType === 'PROJECT') {
            const start = new Date(`${taskData.plannedStart}T00:00:00Z`)
            const end = new Date(`${taskData.plannedEnd}T00:00:00Z`)
            const diffMs = end.getTime() - start.getTime()
            const plannedDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)

            createData.plannedStart = start
            createData.plannedEnd = end
            createData.plannedDays = plannedDays
        } else {
            createData.isRecurring = true
            createData.recurrenceType = taskData.recurrenceType
            createData.recurrenceDay = taskData.recurrenceDay
            createData.recurrenceStart = new Date(`${taskData.recurrenceStart}T00:00:00Z`)
            createData.recurrenceEnd = new Date(`${taskData.recurrenceEnd}T00:00:00Z`)
        }

        // 5. Create Task
        const task = await prisma.planTask.create({
            data: createData
        })

        // 6. Audit Log
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'PlanTask',
            recordId: task.id,
            newValues: task
        })

        return {
            success: true,
            data: task
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_TASK_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'common.error_internal' })
    }
})
