import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'
import { CompanyUpdateSchema } from '../../../shared/schemas/company.schema'

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

        // 2. Validate Body
        const body = await readBody(event)
        const result = CompanyUpdateSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        // 3. Find Old Company
        const oldCompany = await prisma.company.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!oldCompany) {
            throw createError({ statusCode: 404, statusMessage: 'Company not found' })
        }

        // 4. Update Company
        const updatedCompany = await prisma.company.update({
            where: { id },
            data: result.data
        })

        // 5. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'Company',
            recordId: updatedCompany.id,
            oldValues: oldCompany,
            newValues: updatedCompany
        })

        // 6. Response
        return {
            success: true,
            data: updatedCompany
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_COMPANY_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
