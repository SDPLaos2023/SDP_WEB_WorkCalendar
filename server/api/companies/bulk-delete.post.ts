import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
    try {
        // 1. Authorization: Only SUPER_ADMIN can bulk delete companies
        requireRole(event, ['SUPER_ADMIN'])

        const body = await readBody(event)
        const { ids } = body

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid or empty IDs' })
        }

        // 2. Bulk Soft Delete
        // We don't need to check specific scoping for SUPER_ADMIN as they have access to everything.
        await prisma.company.updateMany({
            where: {
                id: { in: ids }
            },
            data: {
                deletedAt: new Date()
            }
        })

        // Also soft delete associated departments, users, etc. if required by policy?
        // Usually, companies are top-level, so deleting them should ideally be handled carefully.
        // For simplicity, we stick to the company soft delete and rely on application logic to handle "orphans".
        // In this project, AGENTS.md says "Never hard delete".

        // 3. Audit Log
        logAudit({
            event,
            action: 'DELETE',
            tableName: 'Company',
            recordId: 'BULK',
            newValues: { deletedIds: ids }
        })

        return {
            success: true,
            message: `Successfully deleted ${ids.length} companies`
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[BULK_DELETE_COMPANIES_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
