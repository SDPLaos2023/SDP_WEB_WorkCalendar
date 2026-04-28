import { prisma } from '../../utils/prisma'
import { requireRole } from '../../utils/auth-helpers'
import { logAudit } from '../../utils/audit'
import { createWorkPlanSchema } from '~~/shared/schemas/work-plan.schema'

export default defineEventHandler(async (event) => {
    try {
        const user = requireRole(event, ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER'])

        // 1. Validate Body
        const body = await readBody(event)
        const result = createWorkPlanSchema.safeParse(body)

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Validation Error',
                data: result.error.flatten().fieldErrors
            })
        }

        const { title, description, year, planStartDate, planEndDate } = result.data
        let { departmentId } = result.data

        // 2. MANAGER Scoping: departmentId forced to user.departmentId
        if (user.role === 'MANAGER') {
            departmentId = user.departmentId!
        }

        // 3. Unique(departmentId, year) check removed (Allow multiple plans per dept/year)
        /*
        const existing = await prisma.workPlan.findFirst({
            where: {
                departmentId,
                year,
                deletedAt: null
            }
        })

        if (existing) {
            throw createError({
                statusCode: 409,
                statusMessage: 'Plan already exists for this department and year'
            })
        }
        */

        // 4. Calculate totalDays
        const start = new Date(`${planStartDate}T00:00:00Z`)
        const end = new Date(`${planEndDate}T00:00:00Z`)
        const diffMs = end.getTime() - start.getTime()
        const totalDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)

        // 5. Create WorkPlan
        const { supervisorIds } = result.data
        const workPlan = await prisma.workPlan.create({
            data: {
                title,
                description,
                year,
                planStartDate: start,
                planEndDate: end,
                totalDays,
                departmentId,
                createdById: user.id,
                status: 'DRAFT',
                supervisors: supervisorIds && supervisorIds.length > 0 ? {
                    create: supervisorIds.map((sid: string) => ({
                        supervisorId: sid,
                        assignedById: user.id
                    }))
                } : undefined
            }
        })

        // 6. Audit Log
        logAudit({
            event,
            action: 'CREATE',
            tableName: 'WorkPlan',
            recordId: workPlan.id,
            newValues: workPlan
        })

        // 7. Response
        return {
            success: true,
            data: workPlan
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[CREATE_WORK_PLAN_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
