import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing department ID' })
        }

        // 1. Find Department
        const department = await prisma.department.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!department) {
            throw createError({ statusCode: 404, statusMessage: 'Department not found' })
        }

        // 2. Authorization: Any authenticated user from same company can access
        if (department.companyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to your own company' })
        }

        // 3. Response
        return {
            success: true,
            data: department
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_DEPARTMENT_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
