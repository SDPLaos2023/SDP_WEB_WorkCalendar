import { verifyToken } from '../utils/jwt'

/**
 * Auth Middleware
 * Runs on every server request to verify JWT from Authorization header.
 * Attaches user payload to event.context.user if valid.
 */
export default defineEventHandler((event) => {
    const authHeader = getRequestHeader(event, 'authorization')

    // 1. If no header, skip (public routes handle their own 401 via auth-helpers)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return
    }

    // 2. Extract token
    const token = authHeader.split(' ')[1]

    if (!token) return

    // 3. Verify Token
    try {
        const decoded = verifyToken(token)

        // 4. Set user to context for use in handlers
        event.context.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            companyId: decoded.companyId,
            departmentId: decoded.departmentId
        }
    } catch (error) {
        // 5. If token is present but invalid/expired, throw 401
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid token'
        })
    }
})
