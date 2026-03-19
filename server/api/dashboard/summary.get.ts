import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined

        // 1. Build Scoping Filters for Plans and Tasks
        const planWhere: any = { deletedAt: null, year }
        const taskWhere: any = { deletedAt: null, workPlan: { deletedAt: null, year } }

        if (user.role === 'SUPER_ADMIN') {
            const filterCompanyId = query.companyId as string
            if (filterCompanyId) {
                planWhere.department = { companyId: filterCompanyId }
                taskWhere.workPlan.department = { companyId: filterCompanyId }
            }
        } else if (user.role === 'ADMIN_COMPANY') {
            planWhere.department = { companyId: user.companyId }
            taskWhere.workPlan.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            planWhere.departmentId = user.departmentId
            taskWhere.workPlan.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            planWhere.supervisors = { some: { supervisorId: user.id } }
            taskWhere.workPlan.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            // Plans they are involved in (via assigned tasks)
            planWhere.tasks = { some: { assignedToId: user.id } }
            taskWhere.assignedToId = user.id
        }

        // Apply external filter if provided (and allowed)
        if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
            planWhere.departmentId = departmentId
            taskWhere.workPlan.departmentId = departmentId
        }

        // 2. Fetch Data
        const [totalPlans, activePlans, departments, statusCountRaw] = await Promise.all([
            prisma.workPlan.count({ where: planWhere }),
            prisma.workPlan.count({ where: { ...planWhere, status: 'ACTIVE' } }),
            prisma.department.findMany({
                where: user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId },
                select: { id: true, name: true }
            }),
            prisma.planTask.groupBy({
                by: ['status'],
                where: taskWhere,
                _count: { _all: true }
            })
        ])

        // Fetch Tasks after counts for heavier logic
        const tasks = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                workPlan: {
                    include: { department: true }
                },
                actuals: {
                    orderBy: { actualDate: 'desc' }
                }
            }
        })

        // 3. Process Calculations
        const projects = tasks.filter(t => t.taskType === 'PROJECT')
        const routines = tasks.filter(t => t.taskType === 'ROUTINE')

        // Status Breakdown from GroupBy
        const statusBreakdown = {
            DONE: statusCountRaw.find(s => s.status === 'DONE')?._count._all || 0,
            IN_PROGRESS: statusCountRaw.find(s => s.status === 'IN_PROGRESS')?._count._all || 0,
            PENDING: statusCountRaw.find(s => s.status === 'PENDING')?._count._all || 0,
            CANCELLED: statusCountRaw.find(s => s.status === 'CANCELLED')?._count._all || 0
        }

        // Project Average Completion
        let totalProjectPct = 0
        projects.forEach(p => {
            totalProjectPct += Number(p.currentCompletionPct || 0)
        })
        const projectAvgCompletion = projects.length > 0
            ? Math.round((totalProjectPct / projects.length) * 100) / 100
            : 0

        // Routine Compliance Average
        let totalCompliancePct = 0
        let missedTodayCount = 0
        const todayStr = new Date().toISOString().split('T')[0]

        routines.forEach(r => {
            totalCompliancePct += Number(r.compliancePct || 0)

            const hasUpdateToday = r.actuals.some(a =>
                new Date(a.actualDate).toISOString().split('T')[0] === todayStr
            )
            if (!hasUpdateToday) missedTodayCount++
        })
        const routineComplianceAvg = routines.length > 0
            ? Math.round((totalCompliancePct / routines.length) * 100) / 100
            : 0

        // Department Performance Correlation
        const deptPerf = new Map<string, { name: string, total: number, sum: number }>()
        tasks.forEach(t => {
            const d = t.workPlan.department
            if (!deptPerf.has(d.id)) deptPerf.set(d.id, { name: d.name, total: 0, sum: 0 })
            const stat = deptPerf.get(d.id)!
            stat.total++
            if (t.taskType === 'PROJECT') {
                stat.sum += Number(t.currentCompletionPct || 0)
            } else {
                stat.sum += Number(t.compliancePct || 0)
            }
        })

        const topDepartments = Array.from(deptPerf.values())
            .map(d => ({ name: d.name, score: Math.round(d.sum / (d.total || 1)) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)

        // 7-Day Trend (Updates)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const recentActuals = await prisma.taskActual.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo },
                planTask: taskWhere
            },
            select: { createdAt: true }
        })

        const trendDataMap: Record<string, number> = {}
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0] as string
            trendDataMap[dateStr] = 0
        }

        recentActuals.forEach(a => {
            const date = a.createdAt.toISOString().split('T')[0] as string
            if (trendDataMap[date] !== undefined) {
                trendDataMap[date] = (trendDataMap[date] as number) + 1
            }
        })

        const trendData = Object.entries(trendDataMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }))

        return {
            success: true,
            data: {
                totalPlans,
                activePlans,
                totalTasks: {
                    project: projects.length,
                    routine: routines.length
                },
                projectAvgCompletion,
                routineComplianceAvg,
                missedToday: missedTodayCount,
                updatesToday: recentActuals.filter(a => a.createdAt >= new Date(new Date().setHours(0,0,0,0))).length,
                statusBreakdown,
                topDepartments,
                trend: trendData
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[DASHBOARD_SUMMARY_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
