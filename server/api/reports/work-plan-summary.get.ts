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
        const format = query.format as string

        // 1. Build Scoping Filters
        const planWhere: any = { deletedAt: null, year }

        if (user.role === 'SUPER_ADMIN') {
            const filterCompanyId = query.companyId as string
            if (filterCompanyId) {
                planWhere.department = { companyId: filterCompanyId }
            }
        } else if (user.role === 'ADMIN_COMPANY') {
            planWhere.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            planWhere.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            planWhere.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            planWhere.tasks = { some: { assignedToId: user.id } }
        }

        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            planWhere.departmentId = departmentId
        }

        // 2. Fetch Plans with Tasks and Actuals
        const plans = await prisma.workPlan.findMany({
            where: planWhere,
            include: {
                department: {
                    select: { name: true }
                },
                tasks: {
                    where: { deletedAt: null },
                    include: {
                        actuals: {
                            orderBy: { actualDate: 'desc' }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // 3. Process Data for Report
        const reportData = plans.map(plan => {
            const projects = plan.tasks.filter(t => t.taskType === 'PROJECT')
            const routines = plan.tasks.filter(t => t.taskType === 'ROUTINE')

            // Project Avg Completion
            let totalProjectPct = 0
            projects.forEach(p => {
                const latest = p.actuals[0]
                if (latest) totalProjectPct += Number(latest.completionPct)
            })
            const projectAvgCompletion = projects.length > 0
                ? Math.round((totalProjectPct / projects.length) * 100) / 100
                : 0

            // Routine Compliance Avg
            let totalCompliancePct = 0
            routines.forEach(r => {
                const compliance = calculateCompliance(r, r.actuals)
                if (compliance) totalCompliancePct += compliance.compliancePct
            })
            const routineComplianceAvg = routines.length > 0
                ? Math.round((totalCompliancePct / routines.length) * 100) / 100
                : 0

            return {
                planId: plan.id,
                planName: plan.title,
                department: plan.department.name,
                year: plan.year,
                status: plan.status,
                totalTasks: plan.tasks.length,
                projectTasks: projects.length,
                routineTasks: routines.length,
                projectAvgCompletion: `${projectAvgCompletion}%`,
                routineComplianceAvg: `${routineComplianceAvg}%`
            }
        })

        // 4. Handle Format
        if (format === 'csv') {
            const csv = convertToCSV(reportData)
            setHeader(event, 'Content-Type', 'text/csv')
            setHeader(event, 'Content-Disposition', `attachment; filename="work-plan-summary-${year}.csv"`)
            return csv
        }

        return {
            success: true,
            data: reportData
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[REPORT_WORK_PLAN_SUMMARY_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
