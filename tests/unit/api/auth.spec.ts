import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../../server/utils/prisma'

vi.stubGlobal('readBody', vi.fn())
vi.stubGlobal('defineEventHandler', vi.fn((h) => h))
vi.stubGlobal('createError', vi.fn((e) => {
    const error = new Error(e.statusMessage || e.message)
    ;(error as any).statusCode = e.statusCode
    return error
}))
vi.stubGlobal('setCookie', vi.fn())

vi.mock('../../../server/utils/prisma', () => ({
    prisma: {
        user: {
            findFirst: vi.fn(),
            update: vi.fn()
        }
    }
}))

vi.mock('../../../server/utils/jwt', () => ({
    signAccessToken: vi.fn().mockReturnValue('mock_access_token'),
    signRefreshToken: vi.fn().mockReturnValue('mock_refresh_token'),
    verifyToken: vi.fn()
}))

vi.mock('../../../server/utils/crypto', () => ({
    hashPassword: vi.fn().mockResolvedValue('hashed_token'),
    comparePassword: vi.fn().mockResolvedValue(true)
}))

describe('POST /api/auth/login handler', () => {
    let handler: any

    beforeEach(async () => {
        vi.clearAllMocks()
        const module = await import('../../../server/api/auth/login.post')
        handler = module.default
    })

    const mockEvent = () => ({
        context: {},
        node: { req: {}, res: {} }
    } as any)

    it('TC-AUTH-01: should return tokens on successful login', async () => {
        const userData = { username: 'testuser', password: 'password123' }
        vi.mocked(readBody).mockResolvedValue(userData)

        vi.mocked(prisma.user.findFirst).mockResolvedValue({
            id: 'u-1',
            username: 'testuser',
            password: 'hashed_password', // In DB it is 'password' field, not 'passwordHash'
            role: 'OFFICER',
            isActive: true,
            companyId: '550e8400-e29b-41d4-a716-446655440001',
            departmentId: '550e8400-e29b-41d4-a716-446655440002'
        } as any)

        vi.mocked(prisma.user.update).mockResolvedValue({} as any)

        const result = await handler(mockEvent())

        expect(result.success).toBe(true)
        expect(result.data.accessToken).toBe('mock_access_token')
    })

    it('TC-AUTH-02: should throw 401 on invalid password', async () => {
        const userData = { username: 'testuser', password: 'wrong_password' }
        vi.mocked(readBody).mockResolvedValue(userData)

        vi.mocked(prisma.user.findFirst).mockResolvedValue({
            id: 'u-1',
            password: 'hashed_password',
            isActive: true
        } as any)

        const { comparePassword } = await import('../../../server/utils/crypto')
        vi.mocked(comparePassword).mockResolvedValue(false)

        await expect(handler(mockEvent())).rejects.toThrow('Invalid credentials')
    })

    it('TC-AUTH-03: should throw 401 on inactive user', async () => {
        const userData = { username: 'testuser', password: 'password123' }
        vi.mocked(readBody).mockResolvedValue(userData)

        // Mock findFirst to return null because isActive: true is in where clause
        vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

        await expect(handler(mockEvent())).rejects.toThrow('Invalid credentials')
    })
})

describe('POST /api/auth/refresh handler', () => {
    let handler: any
    const mockEvent = () => ({
        context: {},
        node: { req: {}, res: {} }
    } as any)

    beforeAll(() => {
        vi.stubGlobal('getCookie', vi.fn())
    })

    beforeEach(async () => {
        vi.clearAllMocks()
        const module = await import('../../../server/api/auth/refresh.post')
        handler = module.default
    })

    it('TC-AUTH-04: should return new access token on valid refresh token', async () => {
        const { verifyToken } = await import('../../../server/utils/jwt')
        const { comparePassword } = await import('../../../server/utils/crypto')

        vi.mocked(getCookie).mockReturnValue('valid_refresh_token')
        vi.mocked(verifyToken).mockReturnValue({ id: 'u-1' })

        vi.mocked(prisma.user.findFirst).mockResolvedValue({
            id: 'u-1',
            email: 'test@example.com',
            refreshTokenHash: 'hashed_token',
            isActive: true,
            role: 'OFFICER',
            companyId: '550e8400-e29b-41d4-a716-446655440001'
        } as any)

        vi.mocked(comparePassword).mockResolvedValue(true)

        const result = await handler(mockEvent())

        expect(result.success).toBe(true)
        expect(result.data.accessToken).toBe('mock_access_token')
    })

    it('TC-AUTH-05: should throw 401 on invalid refresh token', async () => {
        const { verifyToken } = await import('../../../server/utils/jwt')

        vi.mocked(getCookie).mockReturnValue('invalid_token')
        vi.mocked(verifyToken).mockImplementation(() => {
            throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
        })

        await expect(handler(mockEvent())).rejects.toThrow('Invalid token')
    })
})
