import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const taskId = event.context.params?.taskId

        if (!taskId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
        }

        const task = await prisma.planTask.findFirst({
            where: { 
                id: taskId, 
                deletedAt: null 
            },
            include: {
                workPlan: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        department: {
                            select: { 
                                id: true,
                                companyId: true 
                            }
                        }
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                actuals: {
                    where: {
                        // deletedAt: null // TaskActual might not have deletedAt based on schema check
                    },
                    orderBy: { actualDate: 'desc' },
                    take: 50
                }
            }
        })

        if (!task) {
            throw createError({ statusCode: 404, statusMessage: 'Task not found or has been deleted' })
        }

        // Check permission: 
        // 1. Super Admin can see everything
        // 2. Others must be in the same company
        // 3. Officers can ONLY see their own assigned tasks
        const isSuperAdmin = user.role === 'SUPER_ADMIN'
        const isSameCompany = task.workPlan?.department?.companyId === user.companyId
        const isAssigned = task.assignedToId === user.id

        if (!isSuperAdmin) {
            if (!isSameCompany) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company tasks' })
            }
            if (user.role === 'OFFICER' && !isAssigned) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to tasks assigned to others' })
            }
        }

        // Transform results
        const cleanActuals = (task.actuals || []).map(a => ({
            ...a,
            completionPct: Number(a.completionPct)
        }))

        let compliance = null
        if (task.taskType === 'ROUTINE') {
            compliance = calculateCompliance({
                recurrenceType: task.recurrenceType,
                recurrenceStart: task.recurrenceStart,
                recurrenceEnd: task.recurrenceEnd,
                recurrenceDay: task.recurrenceDay
            }, cleanActuals)
        }

        return {
            success: true,
            data: {
                ...task,
                actuals: cleanActuals,
                compliance
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_TASK_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
