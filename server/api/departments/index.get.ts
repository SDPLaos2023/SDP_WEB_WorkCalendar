import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { paginate } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only authenticated users can list departments
        const user = getUser(event)

        // 2. Extract Query Params
        const query = getQuery(event)
        const search = (query.search as string) || ''
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 20

        const companyId = (query.companyId as string) || undefined

        // 3. Define Filter: Always filter by user's company and deletedAt
        const where: any = {
            deletedAt: null
        }

        if (user.role === 'SUPER_ADMIN') {
            if (companyId) {
                where.companyId = companyId
            }
        } else {
            where.companyId = user.companyId
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } }
            ]
        }

        // 4. Paginate
        const result = await paginate(prisma.department, {
            page,
            pageSize: limit,
            where,
            include: { company: true },
            orderBy: { createdAt: 'desc' }
        })

        // 5. Response
        return {
            success: true,
            ...result
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_DEPARTMENTS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
