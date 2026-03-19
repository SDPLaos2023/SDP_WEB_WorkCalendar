import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = getUser(event)
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
        }

        // 1. Fetch User Data
        const user = await prisma.user.findFirst({
            where: {
                id,
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

        // 2. Authorization: Scoping
        if (sessionUser.role === 'MANAGER') {
            if (user.companyId !== sessionUser.companyId || user.departmentId !== sessionUser.departmentId) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other department user' })
            }
        } else if (sessionUser.role !== 'SUPER_ADMIN' && user.companyId !== sessionUser.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company user' })
        }

        // 3. Response
        return {
            success: true,
            data: user
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_USER_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
