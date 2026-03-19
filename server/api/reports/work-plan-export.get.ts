import { prisma } from '../../utils/prisma'
import { getUser } from '../../utils/auth-helpers'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const { format, getWeekOfMonth, getMonth } = require('date-fns')

export default defineEventHandler(async (event) => {
    try {
        const user = getUser(event)
        const query = getQuery(event)
        const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
        const departmentId = (query.departmentId as string) || undefined

        // 1. Fetch Data (Reusing logic from work-plan-grid.get.ts)
        const taskWhere: any = {
            deletedAt: null,
            workPlan: { deletedAt: null, year }
        }

        // RBAC Scoping
        if (user.role === 'ADMIN_COMPANY') {
            taskWhere.workPlan.department = { companyId: user.companyId }
        } else if (user.role === 'MANAGER') {
            taskWhere.workPlan.departmentId = user.departmentId
        } else if (user.role === 'SUPERVISOR') {
            taskWhere.workPlan.supervisors = { some: { supervisorId: user.id } }
        } else if (user.role === 'OFFICER') {
            taskWhere.assignedToId = user.id
        }

        if (departmentId) {
            taskWhere.workPlan.departmentId = departmentId
        }

        const tasks = await prisma.planTask.findMany({
            where: taskWhere,
            include: {
                workPlan: {
                    include: { department: true }
                },
                assignedTo: { select: { firstName: true, lastName: true } },
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

        // 2. Prepare Excel Data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const weekCols = months.flatMap(m => [`${m} W1`, `${m} W2`, `${m} W3`, `${m} W4`])
        
        const header = [
            'No', 'Task Name', 'Owner', 'Person', 'Freq', 'P/A', 
            ...weekCols,
            'Status', 'Remarks'
        ]

        const rows: any[] = [header]

        // Group by Department
        const sectionMap = new Map<string, any[]>()
        tasks.forEach(task => {
            const deptId = task.workPlan.departmentId
            if (!sectionMap.has(deptId)) sectionMap.set(deptId, [])
            sectionMap.get(deptId)!.push(task)
        })

        const getWeekKey = (date: Date) => {
            const m = months[getMonth(date)]
            const w = Math.min(4, getWeekOfMonth(date))
            return `${m} W${w}`
        }

        let taskNo = 1
        for (const [deptId, deptTasks] of sectionMap.entries()) {
            const deptName = deptTasks[0].workPlan.department.name
            // Add Section Row
            rows.push([`Section: ${deptName}`, '', '', '', '', '', ...new Array(50).fill('')])

            deptTasks.forEach(task => {
                const planWeeks = task.plannedWeeks ? JSON.parse(task.plannedWeeks) : []
                const actWeeks = Array.from(new Set(task.actuals.map((a: any) => getWeekKey(new Date(a.actualDate)))))

                // Plan Row
                const planRow = [
                    taskNo,
                    task.taskName,
                    task.workPlan.department.code,
                    task.assignedTo.firstName,
                    task.recurrenceType || 'PROJECT',
                    'Plan'
                ]
                weekCols.forEach(col => {
                    planRow.push(planWeeks.includes(col.replace(' ', '-')) ? 'X' : '')
                })
                planRow.push(task.status === 'DONE' ? 'Closed' : 'Open')
                planRow.push(task.description || '')
                rows.push(planRow)

                // Act Row
                const actRow = [
                    '', '', '', '', '', 'Act'
                ]
                weekCols.forEach(col => {
                    actRow.push(actWeeks.includes(col) ? 'X' : '')
                })
                actRow.push('', '')
                rows.push(actRow)

                taskNo++
            })
        }

        // 3. Create Workbook
        const worksheet = XLSX.utils.aoa_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Plan')

        // Apply basic styling (column widths)
        const wscols = [
            { wch: 5 },  // No
            { wch: 35 }, // Task Name
            { wch: 8 },  // Owner
            { wch: 12 }, // Person
            { wch: 10 }, // Freq
            { wch: 6 },  // P/A
            ...new Array(48).fill({ wch: 4 }), // Weeks
            { wch: 10 }, // Status
            { wch: 30 }  // Remarks
        ]
        worksheet['!cols'] = wscols

        // 4. Generate Buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        setHeader(event, 'Content-Disposition', `attachment; filename="work-plan-${year}.xlsx"`)

        return buffer

    } catch (error: any) {
        console.error('[WORK_PLAN_EXPORT_ERROR]:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error'
        })
    }
})
