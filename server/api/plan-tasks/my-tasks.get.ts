import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)

        const tasks = await prisma.planTask.findMany({
            where: {
                assignedToId: user.id,
                deletedAt: null,
                workPlan: {
                    status: { in: ['DRAFT', 'ACTIVE', 'CLOSED'] },
                    deletedAt: null
                }
            },
            include: {
                workPlan: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
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

        const tasksWithCompliance = tasks.map(task => {
            const cleanActuals = (task.actuals || []).map(a => ({
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
        console.error('[GET_MY_TASKS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
