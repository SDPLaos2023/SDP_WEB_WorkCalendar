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

        // Project Average Completion (Weighted by task weight)
        let totalProjectScore = 0
        let totalProjectWeight = 0
        let simpleProjectPctSum = 0
        
        projects.forEach(p => {
            const w = Number(p.weight || 0)
            const c = Number(p.currentCompletionPct || 0)
            totalProjectScore += c * w
            totalProjectWeight += w
            simpleProjectPctSum += c
        })

        const projectAvgCompletion = totalProjectWeight > 0
            ? Math.round((totalProjectScore / totalProjectWeight) * 100) / 100
            : (projects.length > 0 ? Math.round((simpleProjectPctSum / projects.length) * 100) / 100 : 0)

        // Routine Compliance Average (Weighted by task weight)
        let totalRoutineScore = 0
        let totalRoutineWeight = 0
        let simpleRoutinePctSum = 0
        let missedTodayCount = 0
        const todayStr = new Date().toLocaleDateString('en-CA')

        routines.forEach(r => {
            const w = Number(r.weight || 0)
            const c = Number(r.compliancePct || 0)
            totalRoutineScore += c * w
            totalRoutineWeight += w
            simpleRoutinePctSum += c

            const hasUpdateToday = r.actuals.some(a =>
                new Date(a.actualDate).toISOString().split('T')[0] === todayStr
            )
            if (!hasUpdateToday) missedTodayCount++
        })
        const routineComplianceAvg = totalRoutineWeight > 0
            ? Math.round((totalRoutineScore / totalRoutineWeight) * 100) / 100
            : (routines.length > 0 ? Math.round((simpleRoutinePctSum / routines.length) * 100) / 100 : 0)

        // Department Performance Correlation (Weighted by task weight)
        const deptPerf = new Map<string, { name: string, totalWeight: number, weightedScore: number, simpleSum: number, count: number }>()
        tasks.forEach(t => {
            const d = t.workPlan.department
            if (!deptPerf.has(d.id)) deptPerf.set(d.id, { name: d.name, totalWeight: 0, weightedScore: 0, simpleSum: 0, count: 0 })
            const stat = deptPerf.get(d.id)!
            
            const w = Number(t.weight || 0)
            const score = t.taskType === 'PROJECT' ? Number(t.currentCompletionPct || 0) : Number(t.compliancePct || 0)
            
            stat.weightedScore += score * w
            stat.totalWeight += w
            stat.simpleSum += score
            stat.count++
        })

        const topDepartments = Array.from(deptPerf.values())
            .map(d => ({ 
                name: d.name, 
                score: d.totalWeight > 0 
                    ? Math.round(d.weightedScore / d.totalWeight) 
                    : Math.round(d.simpleSum / (d.count || 1)) 
            }))
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
            const dateStr = d.toLocaleDateString('en-CA')
            trendDataMap[dateStr] = 0
        }

        recentActuals.forEach(a => {
            const date = a.createdAt.toLocaleDateString('en-CA')
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
                updatesToday: recentActuals.filter(a => a.createdAt.toLocaleDateString('en-CA') === todayStr).length,
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
