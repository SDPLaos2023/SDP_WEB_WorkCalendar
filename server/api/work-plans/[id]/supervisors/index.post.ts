import { prisma } from '../../../../utils/prisma'
import { requireRole } from '../../../../utils/auth-helpers'
import { logAudit } from '../../../../utils/audit'
import { z } from 'zod'

const assignSupervisorSchema = z.object({
    supervisorId: z.string().uuid()
})

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])
        const workPlanId = event.context.params?.id

        if (!workPlanId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing work plan ID' })
        }

        // 1. Fetch Work Plan
        const workPlan = await prisma.workPlan.findFirst({
            where: { id: workPlanId, deletedAt: null } as any,
            include: { department: true }
        }) as any

        if (!workPlan) {
            throw createError({ statusCode: 404, statusMessage: 'Work plan not found' })
        }

        if (user.role === 'MANAGER' && workPlan.departmentId !== user.departmentId) {
             throw createError({ statusCode: 403, statusMessage: 'Forbidden: Cannot edit plans outside your department' })
        }

        const body = await readBody(event)
        const result = assignSupervisorSchema.safeParse(body)
        if (!result.success) {
            throw createError({ statusCode: 400, statusMessage: 'Validation Error', data: result.error.flatten().fieldErrors })
        }

        const supervisorId = result.data.supervisorId

        const supervisorUser = await prisma.user.findFirst({
            where: { id: supervisorId, role: 'SUPERVISOR', departmentId: workPlan.departmentId, deletedAt: null } as any
        })

        if (!supervisorUser) {
            throw createError({ statusCode: 400, statusMessage: 'User is not a SUPERVISOR in this department' })
        }

        const assignment = await prisma.workPlanSupervisor.create({
            data: {
                workPlanId,
                supervisorId,
                assignedById: user.id
            }
        })

        logAudit({
            event,
            action: 'CREATE',
            tableName: 'WorkPlanSupervisor',
            recordId: assignment.id,
            newValues: assignment
        } as any)

        return { success: true, data: assignment }
    } catch (error: any) {
        if (error.code === 'P2002') throw createError({ statusCode: 409, message: 'Already assigned' })
        if (error.statusCode) throw error
        console.error('[ASSIGN_SUPERVISOR_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
