import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        const sessionUser = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])
        const id = event.context.params?.id

        if (!id) {
            throw createError({ statusCode: 400, statusMessage: 'Missing user ID' })
        }

        // 1. Fetch User Data
        const oldUser = await prisma.user.findFirst({
            where: {
                id,
                deletedAt: null
            }
        })

        if (!oldUser) {
            throw createError({ statusCode: 404, statusMessage: 'User not found' })
        }

        // 2. Authorization: Scoping
        if (sessionUser.role === 'MANAGER') {
            if (oldUser.companyId !== sessionUser.companyId || oldUser.departmentId !== sessionUser.departmentId) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other department user' })
            }
            if (oldUser.role !== 'OFFICER' && oldUser.role !== 'SUPERVISOR') {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Managers can only delete Supervisor and Officer profiles' })
            }
        } else if (sessionUser.role !== 'SUPER_ADMIN' && oldUser.companyId !== sessionUser.companyId) {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company user' })
        }

        // 3. Update User (Soft Delete)
        const deletedUser = await prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        })

        // 4. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'User',
            recordId: deletedUser.id,
            oldValues: { ...oldUser, password: '[REDACTED]' },
            newValues: { ...deletedUser, password: '[REDACTED]' }
        })

        // 5. Response
        return {
            success: true,
            data: deletedUser
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DELETE_USER_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
