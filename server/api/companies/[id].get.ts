import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY'])
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing company ID' })
        }

        // 1. If not SUPER_ADMIN, check if user belongs to this company
        if (user.role === 'ADMIN_COMPANY' && user.companyId !== id) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to your own company' })
        }

        // 2. Find Company
        const company = await prisma.company.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!company) {
            throw createError({ statusCode: 404, statusMessage: 'Company not found' })
        }

        // 3. Response
        return {
            success: true,
            data: company
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[GET_COMPANY_BY_ID_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
