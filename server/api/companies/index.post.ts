import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'
import { CompanySchema } from '../../../shared/schemas/company.schema'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN can create companies
        requireRole(event, ['SUPER_ADMIN'])

        // 2. Validate Body
        const body = await readBody(event)
        const result = CompanySchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const { name, code } = result.data

        // 3. Check code unique
        const existing = await prisma.company.findFirst({
            where: {
                code,
                deletedAt: null
            }
        })

        if (existing) {
            throw createError({
                statusCode: 409,
                statusMessage: 'Company code already exists'
            })
        }

        // 4. Create Company
        const company = await prisma.company.create({
            data: {
                name,
                code
            }
        })

        // 5. Audit Log (Fire and forget as per logAudit design)
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'Company',
            recordId: company.id,
            newValues: company
        })

        // 6. Response
        return {
            success: true,
            data: company
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_COMPANY_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
