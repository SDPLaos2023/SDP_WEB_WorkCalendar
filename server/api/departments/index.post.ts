import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'
import { DepartmentSchema } from '../../../shared/schemas/department.schema'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN or ADMIN_COMPANY can create departments
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY'])

        // 2. Validate Body
        const body = await readBody(event)
        const result = DepartmentSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const { name, code } = result.data

        // 3. Ensure companyId from user context or body (if SUPER_ADMIN)
        let companyId = user.companyId
        if (user.role === 'SUPER_ADMIN' && body.companyId) {
            companyId = body.companyId
        }

        if (!companyId) {
            throw createError({ statusCode: 400, statusMessage: 'companyId is required' })
        }

        // 4. Check uniqueness of (companyId, code)
        const existing = await prisma.department.findFirst({
            where: {
                companyId,
                code,
                deletedAt: null
            }
        })

        if (existing) {
            throw createError({
                statusCode: 409,
                statusMessage: 'Department code already exists in your company'
            })
        }

        // 5. Create Department
        const department = await prisma.department.create({
            data: {
                name,
                code,
                companyId
            }
        })

        // 6. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'Department',
            recordId: department.id,
            newValues: department
        })

        // 7. Response
        return {
            success: true,
            data: department
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_DEPARTMENT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
