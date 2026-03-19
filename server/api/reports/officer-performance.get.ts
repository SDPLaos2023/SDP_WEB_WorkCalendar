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

        // 1. Build Scoping Filters for Users (Officers only)
        const userWhere: any = {
            role: 'OFFICER',
            deletedAt: null
        }

        if (user.role === 'SUPER_ADMIN') {
             const filterCompanyId = query.companyId as string
             if (filterCompanyId) userWhere.companyId = filterCompanyId
        } else if (user.role === 'ADMIN_COMPANY') {
            userWhere.companyId = user.companyId
        } else if (user.role === 'MANAGER') {
            userWhere.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
             // Supervisory scoping: find officers assigned to supervisor's plans
             userWhere.assignedTasks = {
                 some: {
                     workPlan: { supervisors: { some: { supervisorId: user.id } } }
                 }
             }
        } else if (user.role === 'OFFICER') {
            userWhere.id = user.id
        }

        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            userWhere.departmentId = departmentId
        }

        // 2. Fetch Users with their tasks and actuals
        const officers = await prisma.user.findMany({
            where: userWhere,
            include: {
                department: { select: { name: true } },
                assignedTasks: {
                    where: { deletedAt: null, workPlan: { year } },
                    include: {
                        actuals: {
                            orderBy: { actualDate: 'desc' }
                        }
                    }
                }
            },
            orderBy: { firstName: 'asc' }
        })

        // 3. Process Aggregate Data
        const reportData = officers.map(officer => {
            const tasks = officer.assignedTasks
            const projects = tasks.filter(t => t.taskType === 'PROJECT')
            const routines = tasks.filter(t => t.taskType === 'ROUTINE')

            // Project Avg
            let totalProjectPct = 0
            projects.forEach(p => {
                const latest = p.actuals[0]
                if (latest) totalProjectPct += Number(latest.completionPct)
            })
            const avgProjectPct = projects.length > 0 ? (totalProjectPct / projects.length) : 0

            // Routine Avg
            let totalCompliancePct = 0
            routines.forEach(r => {
                const compliance = calculateCompliance(r, r.actuals)
                if (compliance) totalCompliancePct += compliance.compliancePct
            })
            const avgCompliancePct = routines.length > 0 ? (totalCompliancePct / routines.length) : 0

            const pendingTasks = tasks.filter(t => t.status !== 'DONE' && t.status !== 'COMPLETED').length

            return {
                officerName: `${officer.firstName} ${officer.lastName}`,
                department: officer.department.name,
                totalTasks: tasks.length,
                projectTasks: projects.length,
                routineTasks: routines.length,
                pendingTasks,
                avgProjectPct: `${Math.round(avgProjectPct * 100) / 100}%`,
                avgCompliancePct: `${Math.round(avgCompliancePct * 100) / 100}%`
            }
        })

        // 4. Handle Format
        if (format === 'csv') {
            const csv = convertToCSV(reportData)
            setHeader(event, 'Content-Type', 'text/csv')
            setHeader(event, 'Content-Disposition', `attachment; filename="officer-performance-${year}.csv"`)
            return csv
        }

        return {
            success: true,
            data: reportData
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[REPORT_OFFICER_PERFORMANCE_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
