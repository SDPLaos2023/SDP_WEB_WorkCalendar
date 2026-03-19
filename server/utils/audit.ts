import type { H3Event } from 'h3'
import { enqueueAudit } from './audit-buffer'

/**
 * AuditLog Utility
 * To log every data modification in the system.
 */

interface AuditParams {
    event: H3Event
    action: string
    tableName: string
    recordId?: string | number
    oldValues?: any
    newValues?: any
}

/**
 * logAudit: Record audit logs for data modifications
 * Fire and forget: won't block main request or throw
 *
 * Usage:
 * logAudit({
 *   event,
 *   action: 'CREATE',
 *   tableName: 'User',
 *   recordId: newUser.id,
 *   newValues: newUser
 * })
 */
export const logAudit = (params: AuditParams) => {
    const { event, action, tableName, recordId, oldValues, newValues } = params

    // Non-blocking execution (fire and forget)
    // We use Promise.resolve().then() to ensure it doesn't block the caller
    Promise.resolve().then(async () => {
        try {
            // 1. Get current user from event context (provided by auth middleware)
            const user = event.context.user
            const userId = user?.id || null

            // 2. Get Request Metadata (provided by h3 via auto-imports)
            const ipAddress = getRequestIP(event, { xForwardedFor: true }) || null
            const userAgent = getRequestHeader(event, 'user-agent') || null

            // 3. Clean sensitive data (strip passwordHash)
            const cleanOld = stripSensitiveValues(oldValues)
            const cleanNew = stripSensitiveValues(newValues)

            // 4. Enqueue to buffer instead of immediate write
            enqueueAudit({
                userId,
                action,
                tableName,
                recordId: recordId?.toString() || null,
                oldValues: cleanOld ? JSON.stringify(cleanOld) : null,
                newValues: cleanNew ? JSON.stringify(cleanNew) : null,
                ipAddress,
                userAgent,
                createdAt: new Date()
            })
        } catch (err) {
            // Never throw, only console.error on fail as per requirement
            console.error('[AUDIT_LOG_ERROR]:', err)
        }
    })
}

/**
 * Utility to strip sensitive fields like passwordHash from objects
 */
function stripSensitiveValues(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj

    // If it's an array, map over it
    if (Array.isArray(obj)) {
        return obj.map(item => stripSensitiveValues(item))
    }

    // Create a shallow copy
    const cleaned = { ...obj }

    // Define sensitive fields to remove (per requirement: passwordHash)
    // We add common variations for robustness
    const sensitiveFields = ['passwordHash', 'password_hash', 'password']

    for (const field of sensitiveFields) {
        if (field in cleaned) {
            delete cleaned[field]
        }
    }

    // Recursively clean nested objects
    for (const key in cleaned) {
        const val = cleaned[key]
        if (val && typeof val === 'object' && !(val instanceof Date)) {
            cleaned[key] = stripSensitiveValues(val)
        }
    }

    return cleaned
}
