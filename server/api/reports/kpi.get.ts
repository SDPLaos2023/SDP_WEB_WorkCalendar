import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { calculateCompliance } from '../../utils/compliance'

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined
        const type = (query.type as string) || 'OFFICER' // 'OFFICER' or 'SUPERVISOR'

        if (type === 'OFFICER') {
             // 1. Build Scoping Filters for Officers
            const officerWhere: any = {
                role: 'OFFICER',
                deletedAt: null
            }
            if (user.role === 'ADMIN_COMPANY') officerWhere.companyId = user.companyId
            else if (user.role === 'MANAGER') officerWhere.departmentId = user.departmentId
            if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
                officerWhere.departmentId = departmentId
            }

            const officers = await prisma.user.findMany({
                where: officerWhere,
                include: {
                    department: { select: { name: true } },
                    assignedTasks: {
                        where: { deletedAt: null, workPlan: { year } },
                        include: {
                            workPlan: { select: { title: true } },
                            actuals: { orderBy: { actualDate: 'desc' }, take: 1 }
                        }
                    }
                }
            })

            const reportData = officers.map(officer => {
                const tasks = officer.assignedTasks
                let totalActual = 0
                let totalPlanned = 0 
                
                const taskBreakdown = tasks.map(t => {
                    let actual = 0
                    if (t.taskType === 'PROJECT') {
                        actual = Number(t.actuals[0]?.completionPct || 0)
                    } else {
                        const compliance = calculateCompliance(t as any, t.actuals.map(a => ({ ...a, actualDate: new Date(a.actualDate) })))
                        actual = compliance?.compliancePct || 0
                    }
                    
                    const planned = 100
                    totalPlanned += planned
                    totalActual += actual

                    return {
                        id: t.id,
                        name: t.taskName,
                        type: t.taskType,
                        planTitle: (t as any).workPlan?.title || 'N/A',
                        planned,
                        actual,
                        status: t.status
                    }
                })

                const kpi = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

                return {
                    id: officer.id,
                    name: `${officer.firstName} ${officer.lastName}`,
                    department: officer.department?.name || 'N/A',
                    totalTasks: tasks.length,
                    plannedUnits: totalPlanned,
                    actualUnits: totalActual,
                    kpiPct: Math.round(kpi * 100) / 100,
                    tasks: taskBreakdown
                }
            })

            return { success: true, data: reportData }

        } else {
            // SUPERVISOR KPI
            const supervisorWhere: any = {
                role: 'SUPERVISOR',
                deletedAt: null
            }
            if (user.role === 'ADMIN_COMPANY') supervisorWhere.companyId = user.companyId
            else if (user.role === 'MANAGER') supervisorWhere.departmentId = user.departmentId
            if (departmentId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_COMPANY')) {
                supervisorWhere.departmentId = departmentId
            }

            const supervisors = await prisma.user.findMany({
                where: supervisorWhere,
                include: {
                    department: { select: { name: true } },
                    supervisorPlans: {
                        where: { workPlan: { year, deletedAt: null } },
                        include: {
                            workPlan: {
                                include: {
                                    tasks: {
                                        where: { deletedAt: null },
                                        include: {
                                            workPlan: { select: { title: true } },
                                            actuals: { orderBy: { actualDate: 'desc' }, take: 1 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })

            const reportData = supervisors.map(supervisor => {
                const plans = supervisor.supervisorPlans.map((sp: any) => sp.workPlan)
                const allTasks = plans.flatMap((p: any) => p.tasks)
                
                let totalActual = 0
                let totalPlanned = 0
                
                const taskBreakdown = allTasks.map((t: any) => {
                    let actual = 0
                    if (t.taskType === 'PROJECT') {
                        actual = Number(t.actuals[0]?.completionPct || 0)
                    } else {
                        const compliance = calculateCompliance(t, t.actuals.map((a: any) => ({ ...a, actualDate: new Date(a.actualDate) })))
                        actual = compliance?.compliancePct || 0
                    }
                    
                    const planned = 100
                    totalPlanned += planned
                    totalActual += actual

                    return {
                        id: t.id,
                        name: t.taskName,
                        type: t.taskType,
                        planTitle: t.workPlan?.title || 'N/A',
                        planned,
                        actual,
                        status: t.status
                    }
                })

                const kpi = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

                return {
                    id: supervisor.id,
                    name: `${supervisor.firstName} ${supervisor.lastName}`,
                    department: supervisor.department?.name || 'N/A',
                    totalPlans: plans.length,
                    totalTasks: allTasks.length,
                    plannedUnits: totalPlanned,
                    actualUnits: totalActual,
                    kpiPct: Math.round(kpi * 100) / 100,
                    tasks: taskBreakdown
                }
            })

            return { success: true, data: reportData }
        }
    } catch (error: any) {
        console.error('[KPI_REPORT_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
