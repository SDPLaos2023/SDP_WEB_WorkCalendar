import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])
        const body = await readBody(event)
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid or empty IDs' })
        }

        // 1. Fetch Users to check permissions
        const users = await prisma.user.findMany({
            where: {
                id: { in: ids },
                deletedAt: null
            }
        })

        if (users.length === 0) {
            throw createError({ statusCode: 404, statusMessage: 'No valid users found' })
        }

        // 2. Permission Check
        // Manager can only delete from their department
        // Admin_Company can only delete from their company
        const unauthorizedIds = users.filter(u => {
            if (sessionUser.role === 'SUPER_ADMIN') return false
            if (sessionUser.role === 'ADMIN_COMPANY') return u.companyId !== sessionUser.companyId
            if (sessionUser.role === 'MANAGER') return u.companyId !== sessionUser.companyId || u.departmentId !== sessionUser.departmentId
            return true
        }).map(u => u.id)

        // Also prevent deleting oneself
        if (ids.includes(sessionUser.id)) {
            throw createError({ statusCode: 403, statusMessage: 'Cannot delete your own account' })
        }

        if (unauthorizedIds.length > 0) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: You do not have permission to delete some of the selected users' })
        }

        // 3. Bulk Soft Delete
        await prisma.user.updateMany({
            where: {
                id: { in: ids }
            },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        })

        // 4. Audit Log
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'User',
            recordId: 'BULK',
            newValues: { deletedIds: ids }
        })

        return {
            success: true,
            message: `Successfully deleted ${ids.length} users`
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[BULK_DELETE_USERS_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
