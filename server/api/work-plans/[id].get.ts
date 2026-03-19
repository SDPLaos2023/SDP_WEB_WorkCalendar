import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing plan ID' })
        }

        // 1. Fetch WorkPlan with includes
        const workPlan = await prisma.workPlan.findFirst({
            where: {
                id,
                deletedAt: null
            },
            include: {
                department: {
                    select: { id: true, name: true, companyId: true }
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true }
                },
                tasks: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' }
                },
                supervisors: {
                    select: { supervisorId: true, supervisor: { select: { firstName: true, lastName: true } } }
                }
            } as any
        })

        if (!workPlan) {
            throw createError({ statusCode: 404, statusMessage: 'Work plan not found' })
        }

        // 2. Authorization: Same company only unless SUPER_ADMIN
        if (user.role !== 'SUPER_ADMIN' && (workPlan as any).department.companyId !== user.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company work plan' })
        }

        // 3. Response
        return {
            success: true,
            data: workPlan
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_WORK_PLAN_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
