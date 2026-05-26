import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'
import { convertToCSV } from '../../utils/csv'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined
        const workPlanId = (query.workPlanId as string) || undefined
        const format = query.format as string

        // 1. Build Scoping Filters
        const taskWhere: any = {
            deletedAt: null,
            taskType: 'ROUTINE',
            workPlan: { deletedAt: null, year }
        }

        if (user.role === 'SUPER_ADMIN') {
            const filterCompanyId = query.companyId as string
            if (filterCompanyId) {
                taskWhere.workPlan.department = { companyId: filterCompanyId }
            }
        } else if (user.role === 'ADMIN_COMPANY') {
            taskWhere.workPlan.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            taskWhere.workPlan.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            taskWhere.workPlan.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            taskWhere.assignedToId = user.id
        }

        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            taskWhere.workPlan.departmentId = departmentId
        }
        if (workPlanId) {
            taskWhere.workPlanId = workPlanId
        }

        // 2. Fetch Tasks
        const tasks = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                workPlan: { select: { title: true } },
                assignedTo: { select: { firstName: true, lastName: true } },
                actuals: {
                    where: { deletedAt: null },
                    orderBy: { actualDate: 'desc' },
                    include: {
                        updatedBy: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // 3. Format Data
        const reportData = tasks.map(task => {
            const compliance = calculateCompliance(task, task.actuals)
            const latest = task.actuals[0]
            return {
                taskId: task.id,
                taskName: task.taskName,
                workPlan: task.workPlan.title,
                assignedTo: task.assignedTo
                    ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                    : '-',
                recurrence: task.recurrenceType,
                expected: compliance?.expectedPeriods || 0,
                completed: compliance?.completedPeriods || 0,
                compliancePct: `${compliance?.compliancePct || 0}%`,
                missedCount: compliance?.missedDates.length || 0,
                missedDates: compliance?.missedDates.map(d => d.split('T')[0]).join(', ') || '-',
                latestUpdate: latest
                    ? {
                        actualDate: latest.actualDate?.toISOString().split('T')[0] || null,
                        updateType: latest.updateType,
                        status: latest.status,
                        completionPct: Number(latest.completionPct || 0),
                        note: latest.note || '',
                        attachmentUrl: latest.attachmentUrl || '',
                        updatedBy: `${latest.updatedBy.firstName} ${latest.updatedBy.lastName}`
                    }
                    : null
            }
        })

        // 4. Handle Format
        if (format === 'csv') {
            const csv = convertToCSV(reportData)
            setHeader(event, 'Content-Type', 'text/csv')
            setHeader(event, 'Content-Disposition', `attachment; filename="compliance-report-${year}.csv"`)
            return csv
        }

        return {
            success: true,
            data: reportData
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[REPORT_COMPLIANCE_DETAIL_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
