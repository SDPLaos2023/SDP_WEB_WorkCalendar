import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { hashPassword } from '../../utils/crypto'
import { logAudit } from '../../utils/audit'
import { createUserSchema } from '../../../shared/schemas/user.schema'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN, ADMIN_COMPANY or MANAGER
        const sessionUser = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])

        // 2. Validate Body
        const body = await readBody(event)
        const result = createUserSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const { firstName, lastName, username, email, password, role } = result.data

        // 3. Role Restrictions
        if (sessionUser.role === 'ADMIN_COMPANY') {
            if (role === 'SUPER_ADMIN' || role === 'ADMIN_COMPANY') {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to create MANAGER, SUPERVISOR or OFFICER roles' })
            }
        } else if (sessionUser.role === 'MANAGER') {
            if (role !== 'OFFICER' && role !== 'SUPERVISOR') {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden: You only have access to create SUPERVISOR or OFFICER roles' })
            }
        }

        // 4. Scoping
        let companyId: string
        let departmentId: string | undefined | null

        if (sessionUser.role === 'SUPER_ADMIN') {
            companyId = result.data.companyId as string
            departmentId = result.data.departmentId
        } else if (sessionUser.role === 'ADMIN_COMPANY') {
            companyId = sessionUser.companyId
            departmentId = result.data.departmentId
        } else {
            // MANAGER
            companyId = sessionUser.companyId
            departmentId = sessionUser.departmentId
        }

        if (!companyId) {
            throw createError({ statusCode: 400, statusMessage: 'Missing company ID' })
        }

        // 5. Check uniqueness of email or username
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ],
                deletedAt: null
            }
        })

        if (existing) {
            const isEmail = existing.email === email
            throw createError({
                statusCode: 409,
                statusMessage: isEmail ? 'Email already exists' : 'Username already exists'
            })
        }

        // 6. Hash Password before save
        const passwordHash = await hashPassword(password)

        // 7. Create User
        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                username,
                email,
                password: passwordHash,
                role,
                companyId,
                departmentId,
                isActive: result.data.isActive,
                createdById: sessionUser.id
            }
        })

        // 8. Audit Log (Fire and forget)
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'User',
            recordId: user.id,
            newValues: { ...user, password: '[REDACTED]' }
        })

        // 9. Return Data
        const { password: _, refreshTokenHash: __, ...profile } = user
        return {
            success: true,
            data: profile
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_USER_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
