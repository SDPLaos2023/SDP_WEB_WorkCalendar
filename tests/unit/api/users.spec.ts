import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper to mock readBody
vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('defineEventHandler', vi.fn((h) => h))
vi.stubGlobal('createError', vi.fn((e) => {
    if (e.statusMessage === 'Validation Error') {
        throw new Error(`VALIDATION_ERROR: ${JSON.stringify(e.data)}`)
    }
    const error = new Error(e.statusMessage || e.message)
    ;(error as any).statusCode = e.statusCode
    ;(error as any).data = e.data
    return error
}))

// Mock dependencies
vi.mock('../../../server/utils/prisma', () => ({
    prisma: {
        user: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        }
    }
}))

vi.mock('../../../server/utils/auth-helpers', () => ({
    requireRole: vi.fn()
}))

vi.mock('../../../server/utils/audit', () => ({
    logAudit: vi.fn()
}))

vi.mock('../../../server/utils/crypto', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashed_password')
}))

describe('POST /api/users handler', () => {
    let handler: any

    beforeEach(async () => {
        vi.clearAllMocks()
        // Dynamically import handler after stubs are set
        const module = await import('../../../server/api/users/index.post')
        handler = module.default
    })

    const mockEvent = (body: any) => ({
        context: {},
        node: { req: {}, res: {} }
    } as any)

    it('TC-USER-01: MANAGER should be able to create SUPERVISOR or OFFICER', async () => {
        const sessionUser = { id: '550e8400-e29b-41d4-a716-446655440000', role: 'MANAGER', companyId: '550e8400-e29b-41d4-a716-446655440001', departmentId: '550e8400-e29b-41d4-a716-446655440002' }
        const { requireRole } = await import('../../../server/utils/auth-helpers')
        const { prisma } = await import('../../../server/utils/prisma')

        vi.mocked(requireRole).mockReturnValue(sessionUser)

        const userData = {
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            password: 'password123',
            role: 'SUPERVISOR',
            isActive: true
        }

        vi.mocked(readBody).mockResolvedValue(userData)
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null) // Not existing
        vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u-new', ...userData } as any)

        const result = await handler(mockEvent(userData))

        expect(result.success).toBe(true)
        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'SUPERVISOR',
                companyId: '550e8400-e29b-41d4-a716-446655440001',
                departmentId: '550e8400-e29b-41d4-a716-446655440002'
            })
        }))
    })

    it('TC-USER-02: MANAGER should NOT be able to create MANAGER', async () => {
        const sessionUser = { id: '550e8400-e29b-41d4-a716-446655440000', role: 'MANAGER', companyId: '550e8400-e29b-41d4-a716-446655440001', departmentId: '550e8400-e29b-41d4-a716-446655440002' }
        const { requireRole } = await import('../../../server/utils/auth-helpers')

        vi.mocked(requireRole).mockReturnValue(sessionUser)

        const userData = {
            firstName: 'Bad',
            lastName: 'Manager',
            username: 'badman',
            email: 'bad@example.com',
            password: 'password123',
            role: 'MANAGER',
            isActive: true
        }

        vi.mocked(readBody).mockResolvedValue(userData)

        try {
            await handler(mockEvent(userData))
            expect(true).toBe(false) // Should not reach here
        } catch (error: any) {
            expect(error.statusCode).toBe(403)
            expect(error.message).toContain('You only have access to create SUPERVISOR or OFFICER roles')
        }
    })

    it('TC-USER-09: SUPER_ADMIN should be able to create ADMIN_COMPANY', async () => {
        const sessionUser = { id: 'sa-1', role: 'SUPER_ADMIN' }
        const { requireRole } = await import('../../../server/utils/auth-helpers')
        const { prisma } = await import('../../../server/utils/prisma')

        vi.mocked(requireRole).mockReturnValue(sessionUser)

        const userData = {
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            password: 'password123',
            role: 'ADMIN_COMPANY',
            companyId: '550e8400-e29b-41d4-a716-446655440001',
            isActive: true
        }

        vi.mocked(readBody).mockResolvedValue(userData)
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.user.create).mockResolvedValue({ id: 'u-new', ...userData } as any)

        const result = await handler(mockEvent(userData))

        expect(result.success).toBe(true)
        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                role: 'ADMIN_COMPANY',
                companyId: '550e8400-e29b-41d4-a716-446655440001'
            })
        }))
    })

    it('TC-USER-04: should throw 409 if email or username exists', async () => {
        const sessionUser = { id: 'sa-1', role: 'SUPER_ADMIN' }
        const { requireRole } = await import('../../../server/utils/auth-helpers')
        const { prisma } = await import('../../../server/utils/prisma')
        
        vi.mocked(requireRole).mockReturnValue(sessionUser)
        
        const userData = {
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            password: 'password123',
            role: 'OFFICER',
            companyId: '550e8400-e29b-41d4-a716-446655440001',
            isActive: true
        }
        
        vi.mocked(readBody).mockResolvedValue(userData)
        vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'existing-1', email: 'john@example.com' } as any)

        await expect(handler(mockEvent(userData))).rejects.toThrow('Email already exists')
    })

    describe('GET /api/users handler', () => {
        let getHandler: any

        beforeEach(async () => {
            const module = await import('../../../server/api/users/index.post') // Just to trigger global set
            const getModule = await import('../../../server/api/users/index.get')
            getHandler = getModule.default

            // Mock getQuery
            vi.stubGlobal('getQuery', vi.fn().mockReturnValue({}))
        })

        it('TC-USER-10: SUPER_ADMIN should be able to see users from any company', async () => {
             const sessionUser = { id: 'sa-1', role: 'SUPER_ADMIN' }
             const { requireRole } = await import('../../../server/utils/auth-helpers')
             const { prisma } = await import('../../../server/utils/prisma')

             vi.mocked(requireRole).mockReturnValue(sessionUser)
             vi.mocked(getQuery).mockReturnValue({ companyId: 'some-comp' })

             // paginate helper mock
             const { paginate } = await import('../../../server/utils/pagination')
             vi.mock('../../../server/utils/pagination', () => ({
                 paginate: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
             }))

             await getHandler(mockEvent({}))

             expect(paginate).toHaveBeenCalledWith(
                 prisma.user,
                 expect.objectContaining({
                     where: expect.not.objectContaining({ companyId: expect.anything() })
                 })
             )
             // Note: In GET handler, SUPER_ADMIN doesn't have where.companyId forced unless passed in query
             // Let's verify it doesn't force sessionUser.companyId
        })
    })

    describe('DELETE /api/users/:id handler', () => {
        let deleteHandler: any

        beforeEach(async () => {
            const module = await import('../../../server/api/users/[id].delete')
            deleteHandler = module.default
        })

        it('TC-USER-07: MANAGER should be able to soft delete OFFICER in same dept', async () => {
            const sessionUser = { id: 'm-1', role: 'MANAGER', companyId: 'c-1', departmentId: 'd-1' }
            const { requireRole } = await import('../../../server/utils/auth-helpers')
            const { prisma } = await import('../../../server/utils/prisma')
            
            vi.mocked(requireRole).mockReturnValue(sessionUser)

            const targetUser = { id: 'o-1', role: 'OFFICER', companyId: 'c-1', departmentId: 'd-1' }
            vi.mocked(prisma.user.findFirst).mockResolvedValue(targetUser as any)
            vi.mocked(prisma.user.update).mockResolvedValue({ ...targetUser, deletedAt: new Date(), isActive: false } as any)

            const mockEventDelete = {
                context: { params: { id: 'o-1' } },
                node: { req: {}, res: {} }
            } as any

            const result = await deleteHandler(mockEventDelete)

            expect(result.success).toBe(true)
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'o-1' },
                data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) })
            }))
        })
    })
})
