import { prisma } from '../../../../utils/prisma'
import { getUser } from '../../../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const workPlanId = event.context.params?.id

        if (!workPlanId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing work plan ID' })
        }

        const supervisors = await prisma.workPlanSupervisor.findMany({
            where: { workPlanId },
            include: {
                supervisor: {
                    select: { id: true, firstName: true, lastName: true, email: true, role: true }
                }
            }
        })

        return {
            success: true,
            data: supervisors
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_SUPERVISORS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
