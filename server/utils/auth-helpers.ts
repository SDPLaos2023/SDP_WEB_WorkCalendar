import type { H3Event } from 'h3'

/**
 * auth-helpers: Utility functions for authentication and session management
 */

/**
 * getUser: Returns the current user from the event context or throws 401
 * Use this in every protected route handler.
 */
export const getUser = (event: H3Event) => {
    const user = event.context.user

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized: Session missing or invalid'
        })
    }

    return user
}

/**
 * requireRole: Verifies that the user has one of the allowed roles
 * Roles: 'SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'OFFICER'
 */
export const requireRole = (event: H3Event, allowedRoles: ('SUPER_ADMIN' | 'ADMIN_COMPANY' | 'MANAGER' | 'SUPERVISOR' | 'OFFICER')[]) => {
    const user = getUser(event)

    if (!allowedRoles.includes(user.role as any)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden: Insufficient permissions'
        })
    }

    return user
}
