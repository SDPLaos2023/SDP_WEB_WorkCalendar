import { prisma } from '../../utils/prisma'
import { comparePassword } from '../../utils/crypto'
import { signAccessToken, verifyToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
    try {
        // 1. Read Refresh Token
        const refreshToken = getCookie(event, 'refresh_token')
        if (!refreshToken) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized: No refresh token' })
        }

        // 2. Verify Refresh Token
        const decoded = verifyToken(refreshToken)
        if (!decoded?.id) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized: Invalid refresh token' })
        }

        // 3. Find User
        const user = await prisma.user.findFirst({
            where: {
                id: decoded.id,
                isActive: true,
                deletedAt: null
            }
        })

        if (!user || !user.refreshTokenHash) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized: User not found or session invalid' })
        }

        // 4. Check Hash
        const isMatch = await comparePassword(refreshToken, user.refreshTokenHash)
        if (!isMatch) {
            throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token' })
        }

        // 5. Sign New Access Token
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
            departmentId: user.departmentId
        }
        const accessToken = signAccessToken(payload)

        // 6. Return Data
        return {
            success: true,
            data: { 
                accessToken,
                user: {
                    id: user.id,
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
        console.error('[REFRESH_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
