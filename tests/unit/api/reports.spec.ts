import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../../server/utils/prisma'

// ── Global Nuxt stubs ──────────────────────────────────────────────────────────
vi.stubGlobal('defineEventHandler', vi.fn((h) => h))
vi.stubGlobal('getQuery', vi.fn())
vi.stubGlobal('setHeader', vi.fn())
vi.stubGlobal('createError', vi.fn((e) => {
    const error = new Error(e.statusMessage || e.message)
    ;(error as any).statusCode = e.statusCode
    return error
}))

// ── Prisma mock ────────────────────────────────────────────────────────────────
vi.mock('../../../server/utils/prisma', () => ({
    prisma: {
        workPlan: {
            findMany: vi.fn()
        },
        planTask: {
            findMany: vi.fn()
        },
        user: {
            findMany: vi.fn()
        }
    }
}))

// ── Utility mocks ──────────────────────────────────────────────────────────────
vi.mock('../../../server/utils/auth-helpers', () => ({
    getUser: vi.fn()
}))

vi.mock('../../../server/utils/compliance', () => ({
    calculateCompliance: vi.fn().mockReturnValue({
        expectedPeriods: 10,
        completedPeriods: 8,
        compliancePct: 80,
        missedDates: ['2024-01-05T00:00:00.000Z', '2024-01-12T00:00:00.000Z']
    })
}))

vi.mock('../../../server/utils/csv', () => ({
    convertToCSV: vi.fn().mockReturnValue('col1,col2\n"val1","val2"')
}))

// ── Sample Data ────────────────────────────────────────────────────────────────
const mockPlan = (overrides = {}) => ({
    id: 'plan-1',
    title: 'Annual Plan 2024',
    year: 2024,
    status: 'ACTIVE',
    department: { name: 'IT Department' },
    tasks: [
        {
            id: 't-1',
            taskType: 'PROJECT',
            actuals: [{ completionPct: 75, actualDate: new Date('2024-01-10') }]
        },
        {
            id: 't-2',
            taskType: 'ROUTINE',
            recurrenceType: 'WEEKLY',
            recurrenceStart: new Date('2024-01-01'),
            recurrenceEnd: null,
            recurrenceDay: null,
            actuals: [{ actualDate: new Date('2024-01-07') }]
        }
    ],
    createdAt: new Date(),
    ...overrides
})

const mockOfficer = (overrides = {}) => ({
    id: 'u-1',
    firstName: 'Somchai',
    lastName: 'Jai',
    department: { name: 'HR' },
    assignedTasks: [
        {
            id: 't-1',
            taskType: 'PROJECT',
            status: 'IN_PROGRESS',
            actuals: [{ completionPct: 50, actualDate: new Date() }]
        },
        {
            id: 't-2',
            taskType: 'ROUTINE',
            status: 'PENDING',
            recurrenceType: 'MONTHLY',
            recurrenceStart: new Date('2024-01-01'),
            recurrenceEnd: null,
            recurrenceDay: null,
            actuals: []
        }
    ],
    ...overrides
})

// ── Helper ─────────────────────────────────────────────────────────────────────
const mockEvent = (queryParams: Record<string, string> = {}) => ({
    context: {},
    node: { req: {}, res: {} },
    _queryParams: queryParams
} as any)

describe('Report Module API Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default query returns year only
        vi.mocked(getQuery).mockReturnValue({ year: '2024' })
    })

    // ══════════════════════════════════════════════════════════════════════════
    //  GET /api/reports/work-plan-summary
    // ══════════════════════════════════════════════════════════════════════════
    describe('GET /api/reports/work-plan-summary', () => {
        let handler: any
        beforeEach(async () => {
            vi.clearAllMocks()
            vi.mocked(getQuery).mockReturnValue({ year: '2024' })
            const module = await import('../../../server/api/reports/work-plan-summary.get')
            handler = module.default
        })

        it('TC-RPT-01: MANAGER should only see plans from their own department', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' } as any)
            vi.mocked(prisma.workPlan.findMany).mockResolvedValue([mockPlan()] as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.workPlan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ departmentId: 'd-1' })
                })
            )
        })

        it('TC-RPT-02: ADMIN_COMPANY should see plans scoped to their company', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'a-1', role: 'ADMIN_COMPANY', companyId: 'c-99' } as any)
            vi.mocked(prisma.workPlan.findMany).mockResolvedValue([mockPlan()] as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.workPlan.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        department: { companyId: 'c-99' }
                    })
                })
            )
        })

        it('TC-RPT-03: Response should contain computed project and routine averages', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' } as any)
            vi.mocked(prisma.workPlan.findMany).mockResolvedValue([mockPlan()] as any)

            const result = await handler(mockEvent())

            const item = result.data[0]
            expect(item).toMatchObject({
                planName: 'Annual Plan 2024',
                totalTasks: 2,
                projectTasks: 1,
                routineTasks: 1,
                projectAvgCompletion: '75%'
            })
        })

        it('TC-RPT-04: should return CSV string when format=csv', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' } as any)
            vi.mocked(prisma.workPlan.findMany).mockResolvedValue([mockPlan()] as any)
            vi.mocked(getQuery).mockReturnValue({ year: '2024', format: 'csv' })

            const result = await handler(mockEvent())

            expect(typeof result).toBe('string')
            expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'Content-Type', 'text/csv')
        })

        it('TC-RPT-05: should return empty data array when no plans exist', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' } as any)
            vi.mocked(prisma.workPlan.findMany).mockResolvedValue([])

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(result.data).toEqual([])
        })
    })

    // ══════════════════════════════════════════════════════════════════════════
    //  GET /api/reports/task-progress
    // ══════════════════════════════════════════════════════════════════════════
    describe('GET /api/reports/task-progress', () => {
        let handler: any
        const mockTask = (overrides = {}) => ({
            id: 't-1',
            taskName: 'Build API',
            taskType: 'PROJECT',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            plannedStart: new Date('2024-01-01'),
            plannedEnd: new Date('2024-03-31'),
            workPlan: { title: 'Annual Plan 2024' },
            assignedTo: { firstName: 'Somchai', lastName: 'Jai' },
            actuals: [{ completionPct: 60, actualDate: new Date(), note: 'On track' }],
            ...overrides
        })

        beforeEach(async () => {
            vi.clearAllMocks()
            vi.mocked(getQuery).mockReturnValue({ year: '2024' })
            const module = await import('../../../server/api/reports/task-progress.get')
            handler = module.default
        })

        it('TC-RPT-06: OFFICER should only see their own tasks', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'o-1', role: 'OFFICER' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockTask()] as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.planTask.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ assignedToId: 'o-1' })
                })
            )
        })

        it('TC-RPT-07: should format the latest completion percentage correctly', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockTask()] as any)

            const result = await handler(mockEvent())

            const item = result.data[0]
            expect(item.completionPct).toBe('60%')
            expect(item.assignedTo).toBe('Somchai Jai')
        })

        it('TC-RPT-08: should show 0% completion when no actuals exist', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockTask({ actuals: [] })] as any)

            const result = await handler(mockEvent())

            expect(result.data[0].completionPct).toBe('0%')
        })
    })

    // ══════════════════════════════════════════════════════════════════════════
    //  GET /api/reports/compliance-detail
    // ══════════════════════════════════════════════════════════════════════════
    describe('GET /api/reports/compliance-detail', () => {
        let handler: any
        const mockRoutineTask = (overrides = {}) => ({
            id: 't-2',
            taskName: 'Weekly Status Update',
            taskType: 'ROUTINE',
            recurrenceType: 'WEEKLY',
            recurrenceStart: new Date('2024-01-01'),
            recurrenceEnd: null,
            recurrenceDay: null,
            workPlan: { title: 'Q1 Plan' },
            assignedTo: { firstName: 'Malee', lastName: 'Dee' },
            actuals: [
                { actualDate: new Date('2024-01-07') },
                { actualDate: new Date('2024-01-14') }
            ],
            ...overrides
        })

        beforeEach(async () => {
            vi.clearAllMocks()
            vi.mocked(getQuery).mockReturnValue({ year: '2024' })
            const module = await import('../../../server/api/reports/compliance-detail.get')
            handler = module.default
        })

        it('TC-RPT-09: should call calculateCompliance for each routine task', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            const { calculateCompliance } = await import('../../../server/utils/compliance')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockRoutineTask()] as any)

            await handler(mockEvent())

            expect(calculateCompliance).toHaveBeenCalledTimes(1)
        })

        it('TC-RPT-10: response should include compliance percentage and missed dates count', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockRoutineTask()] as any)

            const result = await handler(mockEvent())

            const item = result.data[0]
            expect(item.compliancePct).toBe('80%')
            expect(item.expected).toBe(10)
            expect(item.completed).toBe(8)
            expect(item.missedCount).toBe(2) // 2 missed dates from mock
        })

        it('TC-RPT-11: SUPERVISOR should see only tasks for their assigned plans', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'sv-1', role: 'SUPERVISOR' } as any)
            vi.mocked(prisma.planTask.findMany).mockResolvedValue([mockRoutineTask()] as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.planTask.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        workPlan: expect.objectContaining({
                            supervisors: { some: { supervisorId: 'sv-1' } }
                        })
                    })
                })
            )
        })
    })

    // ══════════════════════════════════════════════════════════════════════════
    //  GET /api/reports/officer-performance
    // ══════════════════════════════════════════════════════════════════════════
    describe('GET /api/reports/officer-performance', () => {
        let handler: any

        beforeEach(async () => {
            vi.clearAllMocks()
            vi.mocked(getQuery).mockReturnValue({ year: '2024' })
            const module = await import('../../../server/api/reports/officer-performance.get')
            handler = module.default
        })

        it('TC-RPT-12: MANAGER should only see officers in their department', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-5' } as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([mockOfficer()] as any)

            const result = await handler(mockEvent())

            expect(result.success).toBe(true)
            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        role: 'OFFICER',
                        departmentId: 'd-5'
                    })
                })
            )
        })

        it('TC-RPT-13: OFFICER role should only see their own data', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'o-99', role: 'OFFICER' } as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([mockOfficer({ id: 'o-99' })] as any)

            const result = await handler(mockEvent())

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ id: 'o-99' })
                })
            )
        })

        it('TC-RPT-14: should compute totalTasks, pendingTasks, and averages correctly', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([mockOfficer()] as any)

            const result = await handler(mockEvent())

            const item = result.data[0]
            expect(item.officerName).toBe('Somchai Jai')
            expect(item.totalTasks).toBe(2)  // 1 PROJECT + 1 ROUTINE
            expect(item.pendingTasks).toBe(2) // IN_PROGRESS + PENDING both count
            expect(item.projectTasks).toBe(1)
            expect(item.routineTasks).toBe(1)
        })

        it('TC-RPT-15: ADMIN_COMPANY should scope officer query by companyId', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'a-1', role: 'ADMIN_COMPANY', companyId: 'c-7' } as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([mockOfficer()] as any)

            await handler(mockEvent())

            expect(prisma.user.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ companyId: 'c-7' })
                })
            )
        })

        it('TC-RPT-16: should return CSV when format=csv', async () => {
            const { getUser } = await import('../../../server/utils/auth-helpers')
            vi.mocked(getUser).mockReturnValue({ id: 'm-1', role: 'MANAGER', departmentId: 'd-1' } as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([mockOfficer()] as any)
            vi.mocked(getQuery).mockReturnValue({ year: '2024', format: 'csv' })

            const result = await handler(mockEvent())

            expect(typeof result).toBe('string')
            expect(setHeader).toHaveBeenCalledWith(expect.anything(), 'Content-Type', 'text/csv')
            expect(setHeader).toHaveBeenCalledWith(
                expect.anything(),
                'Content-Disposition',
                expect.stringContaining('officer-performance')
            )
        })
    })
})
