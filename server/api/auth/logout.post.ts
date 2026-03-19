import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        // 1. Get current logged in user (Guaranteed if protected route)
        // Note: Logout is typically protected by accessToken
        const user = getUser(event)

        // 2. Clear hash from DB
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshTokenHash: null }
        })

        // 3. Clear cookie
        deleteCookie(event, 'refresh_token')

        return {
            success: true,
            data: null
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[LOGOUT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
