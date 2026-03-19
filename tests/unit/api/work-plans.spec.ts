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
        workPlan: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        workPlanSupervisor: {
            create: vi.fn()
        },
        user: {
            findFirst: vi.fn()
        }
    }
}))

vi.mock('../../../server/utils/auth-helpers', () => ({
    requireRole: vi.fn()
}))

vi.mock('../../../server/utils/audit', () => ({
    logAudit: vi.fn()
}))

describe('Work Plan API Handlers', () => {
    const mockEvent = () => ({
        context: { params: {} },
        node: { req: {}, res: {} }
    } as any)

    describe('POST /api/work-plans', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            const module = await import('../../../server/api/work-plans/index.post')
            handler = module.default
        })

        it('TC-PLAN-01: MANAGER should be able to create plan in their department', async () => {
            const sessionUser = { id: 'm-1', role: 'MANAGER', companyId: '550e8400-e29b-41d4-a716-446655440001', departmentId: '550e8400-e29b-41d4-a716-446655440002' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const planData = {
                title: 'Annual Plan 2024',
                description: 'Plan description',
                year: 2024,
                planStartDate: '2024-01-01T00:00:00Z',
                planEndDate: '2024-12-31T00:00:00Z',
                departmentId: '550e8400-e29b-41d4-a716-446655440002'
            }
            vi.mocked(readBody).mockResolvedValue(planData)
            vi.mocked(prisma.workPlan.create).mockResolvedValue({ id: 'p-1', ...planData, status: 'DRAFT' } as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.workPlan.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    departmentId: '550e8400-e29b-41d4-a716-446655440002',
                    status: 'DRAFT'
                })
            }))
        })

        it('TC-PLAN-02: OFFICER should NOT be able to create plan', async () => {
            const sessionUser = { id: 'o-1', role: 'OFFICER' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockImplementation(() => {
                throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
            })

            await expect(handler(mockEvent())).rejects.toThrow('Forbidden')
        })
    })

    describe('PATCH /api/work-plans/:id/status', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            const module = await import('../../../server/api/work-plans/[id]/status.patch')
            handler = module.default
        })

        it('TC-PLAN-03: should allow valid transition DRAFT -> ACTIVE', async () => {
            const sessionUser = { id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const oldPlan = { id: 'p-1', status: 'DRAFT', departmentId: 'd-1' }
            vi.mocked(prisma.workPlan.findFirst).mockResolvedValue(oldPlan as any)
            vi.mocked(readBody).mockResolvedValue({ status: 'ACTIVE' })
            vi.mocked(prisma.workPlan.update).mockResolvedValue({ ...oldPlan, status: 'ACTIVE' } as any)

            const event = mockEvent()
            event.context.params.id = 'p-1'
            const result = await handler(event)

            expect(result.success).toBe(true)
            expect(prisma.workPlan.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: 'ACTIVE' }
            }))
        })

        it('TC-PLAN-04: should reject invalid transition ACTIVE -> DRAFT', async () => {
            const sessionUser = { id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const oldPlan = { id: 'p-1', status: 'ACTIVE', departmentId: 'd-1', department: { companyId: 'c-1' } }
            vi.mocked(prisma.workPlan.findFirst).mockResolvedValue(oldPlan as any)
            vi.mocked(readBody).mockResolvedValue({ status: 'ACTIVE' })

            const event = mockEvent()
            event.context.params.id = 'p-1'

            await expect(handler(event)).rejects.toThrow('Invalid status transition from ACTIVE to ACTIVE')
        })
    })

    describe('POST /api/work-plans/:id/supervisors', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            const module = await import('../../../server/api/work-plans/[id]/supervisors/index.post')
            handler = module.default
        })

        it('TC-PLAN-05: MANAGER should be able to assign SUPERVISOR to their plan', async () => {
            const sessionUser = { id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const workPlan = { id: 'p-1', departmentId: 'd-1' }
            const supervisorId = '550e8400-e29b-41d4-a716-446655440000'

            vi.mocked(prisma.workPlan.findFirst).mockResolvedValue(workPlan as any)
            vi.mocked(readBody).mockResolvedValue({ supervisorId })
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: supervisorId, role: 'SUPERVISOR', departmentId: 'd-1' } as any)
            vi.mocked(prisma.workPlanSupervisor.create).mockResolvedValue({ id: 'as-1', workPlanId: 'p-1', supervisorId } as any)

            const event = mockEvent()
            event.context.params.id = 'p-1'
            const result = await handler(event)

            expect(result.success).toBe(true)
            expect(prisma.workPlanSupervisor.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ workPlanId: 'p-1', supervisorId })
            }))
        })
    })
})
