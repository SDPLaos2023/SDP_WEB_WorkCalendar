import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { paginate } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Allow OFFICER so they can load user lists for assignments
        const sessionUser = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR', 'OFFICER'])

        // 2. Extract Query Params
        const query = getQuery(event)
        const role = (query.role as string) || undefined
        const departmentId = (query.departmentId as string) || undefined
        const search = (query.search as string) || ''
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 20

        // 3. Define Filter and Scoping
        const where: any = {
            deletedAt: null
        }

        // Apply Scoping and Filters based on Role
        if (sessionUser.role === 'SUPER_ADMIN') {
            if (departmentId) where.departmentId = departmentId
        } else if (sessionUser.role === 'ADMIN_COMPANY') {
            where.companyId = sessionUser.companyId
            if (departmentId) where.departmentId = departmentId
        } else if (['MANAGER', 'SUPERVISOR', 'OFFICER'].includes(sessionUser.role)) {
            where.companyId = sessionUser.companyId
            where.departmentId = sessionUser.departmentId
        }

        // Apply other Filters
        if (role) where.role = role
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } }
            ]
        }

        // 4. Paginate
        const result = await paginate(prisma.user, {
            page,
            pageSize: limit,
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                username: true,
                lastName: true,
                role: true,
                companyId: true,
                departmentId: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: { name: true }
                },
                department: {
                    select: { name: true }
                }
            }
        })

        // 5. Response
        return {
            success: true,
            ...result
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_USERS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
