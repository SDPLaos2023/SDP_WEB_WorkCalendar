import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { paginate } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)

        // 1. Extract Query Params
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : undefined
        const status = (query.status as string) || undefined
        const departmentId = (query.departmentId as string) || undefined
        const page = parseInt(query.page as string) || 1
        const limit = parseInt(query.limit as string) || 20

        // 2. Define Filter and Scoping
        const where: any = {
            deletedAt: null
        }

        // Apply Scoping
        if (user.role === 'ADMIN_COMPANY') {
            where.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER' || user.role === 'OFFICER') {
            where.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            where.supervisors = { some: { supervisorId: user.id } }
        }

        // Apply Filters
        if (year) where.year = year
        if (status && status !== 'ALL') where.status = status
        if (departmentId) where.departmentId = departmentId

        // 3. Paginate
        const result = await paginate(prisma.workPlan, {
            page,
            pageSize: limit,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                department: { select: { name: true } },
                _count: { select: { tasks: { where: { deletedAt: null } } } }
            }
        })

        // 4. Response
        return {
            success: true,
            ...result
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_WORK_PLANS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
