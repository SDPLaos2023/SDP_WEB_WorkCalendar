import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'
import { calculateCompliance } from '../../../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const workPlanId = event.context.params?.id

        if (!workPlanId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing work plan ID' })
        }

        // 1. Verify Work Plan exists and user has access
        const workPlan = await prisma.workPlan.findFirst({
            where: { id: workPlanId, deletedAt: null },
            include: { department: true }
        })

        if (!workPlan) {
            throw createError({ statusCode: 404, statusMessage: 'Work plan not found' })
        }

        if (user.role !== 'SUPER_ADMIN' && workPlan.department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company tasks' })
        }

        // 2. Extract Query Params
        const query = getQuery(event)
        const taskType = (query.taskType as string) || undefined
        const status = (query.status as string) || undefined
        const assignedToId = (query.assignedToId as string) || undefined

        // 3. Find Tasks
        const tasks = await prisma.planTask.findMany({
            where: {
                workPlanId,
                taskType,
                status,
                assignedToId,
                deletedAt: null
            },
            include: {
                assignedTo: {
                    select: { id: true, firstName: true, lastName: true }
                },
                actuals: {
                    select: { 
                        id: true,
                        actualDate: true, 
                        completionPct: true, 
                        status: true, 
                        note: true,
                        createdAt: true 
                    },
                    orderBy: { actualDate: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // 4. Transform and Calculate Compliance for ROUTINE tasks
        const tasksWithCompliance = tasks.map(task => {
            // Ensure actuals are clean and fields are present as intended
            const cleanActuals = task.actuals.map(a => ({
                ...a,
                completionPct: Number(a.completionPct),
                createdAt: a.createdAt?.toISOString()
            }))

            const result = {
                ...task,
                actuals: cleanActuals
            }

            if (task.taskType === 'ROUTINE') {
                const compliance = calculateCompliance({
                    recurrenceType: task.recurrenceType,
                    recurrenceStart: task.recurrenceStart,
                    recurrenceEnd: task.recurrenceEnd,
                    recurrenceDay: task.recurrenceDay
                }, cleanActuals)
                return { ...result, compliance }
            }
            return result
        })

        return {
            success: true,
            data: tasksWithCompliance
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_TASKS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
