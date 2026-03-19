import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { hashPassword } from '../../utils/crypto'
import { logAudit } from '../../utils/audit'
import { updateUserSchema } from '../../../shared/schemas/user.schema'

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
        } else if (sessionUser.role === 'ADMIN_COMPANY') {
            if (oldUser.companyId !== sessionUser.companyId) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied to other company user' })
            }
        } else if (sessionUser.role !== 'SUPER_ADMIN') {
            throw createError({ statusCode: 403, statusMessage: 'Forbidden: Access denied' })
        }

        // 3. Validate Body
        const body = await readBody(event)
        const result = updateUserSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const data: any = { ...result.data }

        // 3. Role and Scoping Restrictions
        if (sessionUser.role === 'ADMIN_COMPANY') {
            if (data.role && (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN_COMPANY')) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You cannot assign this role' })
            }
            if (data.companyId && data.companyId !== sessionUser.companyId) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You cannot change company' })
            }
        } else if (sessionUser.role === 'MANAGER') {
            if (data.role && data.role !== 'OFFICER' && data.role !== 'SUPERVISOR') {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You can only manage SUPERVISOR and OFFICER roles' })
            }
            if (oldUser.role !== 'OFFICER' && oldUser.role !== 'SUPERVISOR' && oldUser.id !== sessionUser.id) {
                 throw createError({ statusCode: 403, statusMessage: 'Forbidden: Managers can only manage Supervisor and Officer profiles' })
            }
            if (data.companyId && data.companyId !== sessionUser.companyId) {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You cannot change company' })
            }
        }

        // 4. Check uniqueness if email or username is updated
        if (data.email || data.username) {
            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        data.email ? { email: data.email } : undefined,
                        data.username ? { username: data.username } : undefined
                    ].filter(Boolean) as any,
                    id: { not: id },
                    deletedAt: null
                }
            })

            if (existing) {
                const isEmail = existing.email === data.email
                throw createError({
                    statusCode: 409,
                    statusMessage: isEmail ? 'Email already exists' : 'Username already exists'
                })
            }
        }

        // 4. Hash Password if it exists
        if (data.password) {
            data.password = await hashPassword(data.password)
        }

        // 5. Update User
        const updatedUser = await prisma.user.update({
            where: { id },
            data
        })

        // 6. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'UPDATE',
            tableName: 'User',
            recordId: updatedUser.id,
            oldValues: { ...oldUser, password: '[REDACTED]' },
            newValues: { ...updatedUser, password: '[REDACTED]' }
        })

        // 7. Return Data
        const { password: _, refreshTokenHash: __, ...profile } = updatedUser
        return {
            success: true,
            data: profile
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[UPDATE_USER_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
