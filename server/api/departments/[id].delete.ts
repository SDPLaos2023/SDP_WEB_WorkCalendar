import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN or ADMIN_COMPANY
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY'])

        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing department ID' })
        }

        // 2. Find Old Department
        const oldDepartment = await prisma.department.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!oldDepartment) {
            throw createError({ statusCode: 404, statusMessage: 'Department not found' })
        }

        // 3. Authorization: Check same company unless SUPER_ADMIN
        if (oldDepartment.companyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to your own company' })
        }

        // 4. Update Department (Soft Delete)
        const deletedDepartment = await prisma.department.update({
            where: { id },
            data: {
                deletedAt: new Date()
            }
        })

        // 5. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'Department',
            recordId: deletedDepartment.id,
            oldValues: oldDepartment,
            newValues: deletedDepartment
        })

        // 6. Response
        return {
            success: true,
            data: deletedDepartment
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DELETE_DEPARTMENT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
