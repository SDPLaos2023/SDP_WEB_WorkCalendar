import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'
import { DepartmentUpdateSchema } from '../../../shared/schemas/department.schema'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY'])
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing department ID' })
        }

        // 1. Find Old Department
        const oldDepartment = await prisma.department.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!oldDepartment) {
            throw createError({ statusCode: 404, statusMessage: 'Department not found' })
        }

        // 2. Authorization: Check same company unless SUPER_ADMIN
        if (oldDepartment.companyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to your own company' })
        }

        // 3. Validate Body
        const body = await readBody(event)
        const result = DepartmentUpdateSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        // 4. Update Department
        const updatedDepartment = await prisma.department.update({
            where: { id },
            data: result.data
        })

        // 5. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'Department',
            recordId: updatedDepartment.id,
            oldValues: oldDepartment,
            newValues: updatedDepartment
        })

        // 6. Response
        return {
            success: true,
            data: updatedDepartment
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_DEPARTMENT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
