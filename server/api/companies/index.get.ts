import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { paginate } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN can list all companies
        requireRole(event, ['SUPER_ADMIN'])

        // 2. Extract Query Params
        const query = getQuery(event)
        const search = (query.search as string) || ''
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 20

        // 3. Define Filter
        const where: any = {
            deletedAt: null
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } }
            ]
        }

        // 4. Paginate
        const result = await paginate(prisma.company, {
            page,
            pageSize: limit,
            where,
            orderBy: { createdAt: 'desc' }
        })
        // 5. Response
        return {
            success: true,
            ...result
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_COMPANIES_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
