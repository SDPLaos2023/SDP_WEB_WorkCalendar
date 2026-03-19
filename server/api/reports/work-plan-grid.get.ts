import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { format, getWeekOfMonth, getMonth } = require('date-fns')

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
            workPlan: {
                deletedAt: null,
                year: year
            }
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

        // Additional Filters
        if (departmentId) {
            taskWhere.workPlan.departmentId = departmentId
        }
        if (status) {
            // Map Excel-style status: Open -> PENDING/IN_PROGRESS, Closed -> DONE
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

        // 2. Fetch Data
        const tasks = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                workPlan: {
                    include: {
                        department: true
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                actuals: {
                    where: {
                        actualDate: {
                            gte: new Date(`${year}-01-01`),
                            lte: new Date(`${year}-12-31`)
                        }
                    },
                    orderBy: { actualDate: 'asc' }
                }
            },
            orderBy: [
                { workPlan: { department: { name: 'asc' } } },
                { createdAt: 'asc' }
            ]
        })

        // 3. Helper to Convert Date to "Jan-W1" Format
        const getWeekKey = (date: Date) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const month = months[getMonth(date)]
            const week = getWeekOfMonth(date)
            // Clamp week to 1-4 as per Excel spec (G-BD columns)
            const weekNum = Math.min(4, week)
            return `${month}-W${weekNum}`
        }

        // 4. Process into Sections
        const sectionMap = new Map<string, any>()

        // Roman numeral mapping for sections as per Reports.md
        const romanNumbers: Record<string, string> = {
            'SDP Management': 'I',
            'GPS': 'II',
            'E-SEAL': 'III',
            'Infrastructure': 'IV',
            'CCTV': 'V',
            'Software': 'VI',
            'SDP HR': 'VII'
        }

        tasks.forEach(task => {
            const deptName = task.workPlan.department.name
            const deptId = task.workPlan.department.id

            if (!sectionMap.has(deptId)) {
                const roman = Object.keys(romanNumbers).find(k => deptName.includes(k))
                const sectionLabel = roman ? `${romanNumbers[roman]}. ${deptName}` : deptName

                sectionMap.set(deptId, {
                    id: deptId,
                    name: sectionLabel,
                    tasks: []
                })
            }

            const planWeeks = task.plannedWeeks ? JSON.parse(task.plannedWeeks) : []
            const actWeeks = Array.from(new Set(task.actuals.map((a: any) => getWeekKey(new Date(a.actualDate)))))

            sectionMap.get(deptId).tasks.push({
                id: task.id,
                taskName: task.taskName,
                owner: task.workPlan.department.code,
                person: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
                frequency: task.recurrenceType || (task.taskType === 'PROJECT' ? 'One-time' : 'N/A'),
                status: task.status === 'DONE' ? 'Closed' : 'Open',
                remarks: task.description || '',
                planWeeks,
                actWeeks
            })
        })

        return {
            success: true,
            meta: {
                title: `${year} Work Plan / Work Schedule`,
                year,
                date: format(new Date(), 'dd MMM yyyy')
            },
            sections: Array.from(sectionMap.values())
        }

    } catch (error: any) {
        console.error('[WORK_PLAN_GRID_ERROR]:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error'
        })
    }
})
