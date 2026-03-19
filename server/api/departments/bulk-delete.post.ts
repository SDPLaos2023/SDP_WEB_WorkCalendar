import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Only SUPER_ADMIN or ADMIN_COMPANY can bulk delete
  requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY'])

  try {
    const body = await readBody(event)
    const { ids } = z.object({
      ids: z.array(z.string().uuid())
    }).parse(body)

    const where: any = {
      id: { in: ids },
      deletedAt: null
    }

    // If not SUPER_ADMIN, only allow deleting from own company
    if (user.role !== 'SUPER_ADMIN') {
      where.companyId = user.companyId
    }

    const result = await prisma.department.updateMany({
      where,
      data: {
        deletedAt: new Date()
      }
    })

    // Audit log
    logAudit({
      event,
      action: 'DELETE',
      tableName: 'tb_departments',
      recordId: ids.join(','),
      newValues: { count: result.count, ids }
    })

    return {
      success: true,
      count: result.count
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request data' })
    }
    console.error('Bulk delete department error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
