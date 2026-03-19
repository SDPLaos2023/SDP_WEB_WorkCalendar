import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN can delete companies
        requireRole(event, ['SUPER_ADMIN'])

        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing company ID' })
        }

        // 2. Find Old Company
        const oldCompany = await prisma.company.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!oldCompany) {
            throw createError({ statusCode: 404, statusMessage: 'Company not found' })
        }

        // 3. Update Company (Soft Delete)
        const deletedCompany = await prisma.company.update({
            where: { id },
            data: {
                deletedAt: new Date()
            }
        })

        // 4. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'Company',
            recordId: deletedCompany.id,
            oldValues: oldCompany,
            newValues: deletedCompany
        })

        // 5. Response
        return {
            success: true,
            data: deletedCompany
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DELETE_COMPANY_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
