import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../../server/utils/prisma'

vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('defineEventHandler', vi.fn((h) => h))
vi.stubGlobal('createError', vi.fn((e) => {
    const error = new Error(e.statusMessage || e.message)
    ;(error as any).statusCode = e.statusCode
    ;(error as any).data = e.data
    return error
}))

vi.mock('../../../server/utils/prisma', () => ({
    prisma: {
        planTask: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        workPlan: {
            findFirst: vi.fn()
        },
        user: {
            findFirst: vi.fn()
        },
        taskActual: {
            findFirst: vi.fn(),
            create: vi.fn()
        },
        $transaction: vi.fn((cb) => cb(prisma))
    }
}))

vi.mock('../../../server/utils/auth-helpers', () => ({
    requireRole: vi.fn(),
    getUser: vi.fn()
}))

vi.mock('../../../server/utils/audit', () => ({
    logAudit: vi.fn()
}))

describe('Task and Actual API Handlers', () => {
    const mockEvent = () => ({
        context: { params: {} },
        node: { req: {}, res: {} }
    } as any)

    describe('POST /api/work-plans/:id/tasks', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            const module = await import('../../../server/api/work-plans/[id]/tasks/index.post')
            handler = module.default
        })

        it('TC-TASK-01: SUPERVISOR should be able to create task in assigned plan', async () => {
            const sessionUser = { id: 's-1', role: 'SUPERVISOR' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const workPlan = { id: 'p-1', departmentId: 'd-1', supervisors: [{ supervisorId: 's-1' }] }
            vi.mocked(prisma.workPlan.findFirst).mockResolvedValue(workPlan as any)

            const taskData = {
                taskName: 'Task 1',
                taskType: 'PROJECT',
                priority: 'MEDIUM',
                assignedToId: '550e8400-e29b-41d4-a716-446655440000',
                plannedStart: '2024-01-01',
                plannedEnd: '2024-01-10'
            }
            vi.mocked(readBody).mockResolvedValue(taskData)
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: taskData.assignedToId, role: 'OFFICER' } as any)
            vi.mocked(prisma.planTask.create).mockResolvedValue({ id: 't-1', ...taskData } as any)

            const event = mockEvent()
            event.context.params.id = 'p-1'
            const result = await handler(event)

            expect(result.success).toBe(true)
            expect(prisma.planTask.create).toHaveBeenCalled()
        })

        it('TC-TASK-03: should reject assignment to non-OFFICER', async () => {
            const sessionUser = { id: 's-1', role: 'SUPERVISOR' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const workPlan = { id: 'p-1', departmentId: 'd-1', supervisors: [{ supervisorId: 's-1' }] }
            vi.mocked(prisma.workPlan.findFirst).mockResolvedValue(workPlan as any)

            const taskData = {
                taskName: 'Task 1',
                taskType: 'PROJECT',
                priority: 'MEDIUM',
                assignedToId: '550e8400-e29b-41d4-a716-446655440001',
                plannedStart: '2024-01-01',
                plannedEnd: '2024-01-10'
            }
            vi.mocked(readBody).mockResolvedValue(taskData)
            vi.mocked(prisma.user.findFirst).mockResolvedValue(null) // Not an officer

            const event = mockEvent()
            event.context.params.id = 'p-1'
            
            await expect(handler(event)).rejects.toThrow('Assigned user must be an OFFICER')
        })
    })

    describe('POST /api/plan-tasks/:taskId/actuals', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            const module = await import('../../../server/api/plan-tasks/[taskId]/actuals/index.post')
            handler = module.default
        })

        it('TC-TASK-07: OFFICER should be able to submit TaskActual for their own task', async () => {
            const sessionUser = { id: 'o-1', role: 'OFFICER' }
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue(sessionUser as any)

            const task = { id: 't-1', assignedToId: 'o-1', taskType: 'PROJECT' }
            vi.mocked(prisma.planTask.findFirst).mockResolvedValue(task as any)

            const actualData = {
                actualDate: '2024-01-01',
                updateType: 'DAILY',
                completionPct: 50,
                status: 'PARTIAL'
            }
            vi.mocked(readBody).mockResolvedValue(actualData)
            vi.mocked(prisma.taskActual.create).mockResolvedValue({ id: 'a-1', ...actualData } as any)

            const event = mockEvent()
            event.context.params.taskId = 't-1'
            const result = await handler(event)

            expect(result.success).toBe(true)
            expect(prisma.taskActual.create).toHaveBeenCalled()
        })

        it('TC-TASK-09: should throw 409 for duplicate ROUTINE update', async () => {
            const sessionUser = { id: 'o-1', role: 'OFFICER' }
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue(sessionUser as any)

            const task = { id: 't-1', assignedToId: 'o-1', taskType: 'ROUTINE' }
            vi.mocked(prisma.planTask.findFirst).mockResolvedValue(task as any)

            const actualData = {
                actualDate: '2024-01-01',
                updateType: 'DAILY',
                completionPct: 100,
                status: 'DONE'
            }
            vi.mocked(readBody).mockResolvedValue(actualData)
            vi.mocked(prisma.taskActual.findFirst).mockResolvedValue({ id: 'existing-a' } as any)

            const event = mockEvent()
            event.context.params.taskId = 't-1'
            
            await expect(handler(event)).rejects.toThrow('Already updated for this period')
        })
    })
})
