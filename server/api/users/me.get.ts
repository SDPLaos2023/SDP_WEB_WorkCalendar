import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        // 1. Get current authenticated user id from JWT context
        const sessionUser = getUser(event)

        // 2. Fetch full profile from DB
        const user = await prisma.user.findFirst({
            where: {
                id: sessionUser.id,
                deletedAt: null
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                companyId: true,
                departmentId: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: { id: true, name: true, code: true }
                },
                department: {
                    select: { id: true, name: true, code: true }
                }
            }
        })

        if (!user) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        // 3. Return Data
        return {
            success: true,
            data: user
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_ME_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
