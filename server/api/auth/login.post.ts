import { prisma } from '../../utils/prisma'
import { comparePassword, hashPassword } from '../../utils/crypto'
import { signAccessToken, signRefreshToken } from '../../utils/jwt'
import { loginSchema } from '~~/shared/schemas/auth.schema'

export default defineEventHandler(async (event) => {
    try {
        // 1. Validate Input
        const body = await readBody(event)
        const result = loginSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const { username, password } = result.data

        // 2. Find User
        const user = await prisma.user.findFirst({
            where: {
                username,
                isActive: true,
                deletedAt: null
            }
        })

        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
        }

        // 3. Verify Password
        const isMatch = await comparePassword(password, user.password)
        if (!isMatch) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
        }

        // 4. Generate Tokens
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            departmentId: user.departmentId
        }

        const accessToken = signAccessToken(payload)
        const refreshToken = signRefreshToken({ id: user.id })

        // 5. Store Refresh Token Hash
        const refreshTokenHash = await hashPassword(refreshToken)
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash }
        })

        // 6. Set Cookie
        setCookie(event, 'refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        })

        // 7. Return Data
        return {
            success: true,
            data: {
                accessToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    companyId: user.companyId,
                    departmentId: user.departmentId
                }
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[LOGIN_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
