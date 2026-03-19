import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const companyId = (query.companyId as string) || undefined
        const departmentId = (query.departmentId as string) || undefined
        const status = (query.status as string) || undefined
        const assignedToId = (query.assignedTo as string) || undefined

        // 1. Build Scoping Filters
        const taskWhere: any = {
            deletedAt: null,
            workPlan: { deletedAt: null, year }
        }

        // RBAC Scoping + Additional Filters
        if (user.role === 'ADMIN_COMPANY') {
            taskWhere.workPlan.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            taskWhere.workPlan.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            taskWhere.workPlan.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            taskWhere.assignedToId = user.id
        }

        // Dropdown Filters
        if (companyId && user.role === 'SUPER_ADMIN') {
            taskWhere.workPlan.department = { ...taskWhere.workPlan.department, companyId }
        }
        if (departmentId) {
            taskWhere.workPlan.departmentId = departmentId
        }
        if (status) {
            if (status === 'Open') {
                taskWhere.status = { in: ['PENDING', 'IN_PROGRESS'] }
            } else if (status === 'Closed') {
                taskWhere.status = 'DONE'
            } else {
                taskWhere.status = status
            }
        }
        if (assignedToId) {
            taskWhere.assignedToId = assignedToId
        }

        // 2. Fetch Tasks with Actuals for calculations
        const tasks = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                workPlan: {
                    include: { 
                        department: {
                            include: { company: true }
                        }
                    }
                },
                actuals: true
            }
        })

        // 3. Aggregate by Section
        const sectionData = new Map<string, any>()

        tasks.forEach(task => {
            const deptId = task.workPlan.departmentId
            const deptName = task.workPlan.department.name
            const companyCode = task.workPlan.department.company.code
            const sectionLabel = `[${companyCode}] ${deptName}`

            if (!sectionData.has(deptId)) {
                sectionData.set(deptId, {
                    section: sectionLabel,
                    totalTasks: 0,
                    plannedUnits: 0,
                    actualDone: 0,
                    totalCompliance: 0,
                    routineCount: 0
                })
            }

            const stats = sectionData.get(deptId)
            stats.totalTasks++

            // Planned vs Actual logic
            if (task.taskType === 'PROJECT') {
                stats.plannedUnits += 100 // Each project task is 100% planned
                const latest = task.actuals.sort((a: any, b: any) => b.actualDate.getTime() - a.actualDate.getTime())[0]
                stats.actualDone += Number(latest?.completionPct || 0)
            } else {
                stats.routineCount++
                const compliance = calculateCompliance(task as any, task.actuals)
                if (compliance) {
                    stats.totalCompliance += compliance.compliancePct
                }
            }
        })

        const result = Array.from(sectionData.values()).map((s: any) => {
            const complianceAvg = s.routineCount > 0 ? (s.totalCompliance / s.routineCount) : 0
            const projectCount = s.totalTasks - s.routineCount
            const projectProgress = projectCount > 0
                ? (s.actualDone / (s.plannedUnits || 1)) * 100
                : 0

            // Overall progress: 
            // - If only projects: projectProgress
            // - If only routines: complianceAvg
            // - If both: weighted average (or just average for simplicity)
            let overallProgress = 0
            if (projectCount > 0 && s.routineCount > 0) {
                overallProgress = (projectProgress + complianceAvg) / 2
            } else if (projectCount > 0) {
                overallProgress = projectProgress
            } else if (s.routineCount > 0) {
                overallProgress = complianceAvg
            }

            return {
                section: s.section,
                totalTasks: s.totalTasks,
                planned: s.plannedUnits || s.totalTasks * 100, // Fallback
                actualDone: Math.round(s.actualDone),
                compliancePct: Math.round(complianceAvg) + '%',
                progressPct: Math.round(projectProgress) + '%',
                overallProgressPct: Math.round(overallProgress) + '%'
            }
        })

        return {
            success: true,
            data: result
        }

    } catch (error: any) {
        console.error('[WORK_PLAN_SUMMARY_ERROR]:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: 'Internal server error'
        })
    }
})
