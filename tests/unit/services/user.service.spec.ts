import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userService } from '../../../server/services/user.service'
import { userRepository } from '../../../server/utils/repositories'
import * as cryptoUtils from '../../../server/utils/crypto'

// Mock the repository and crypto utilities
vi.mock('../../../server/utils/repositories', () => ({
    userRepository: {
        findPaginated: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findByUsername: vi.fn(),
        findByEmail: vi.fn()
    }
}))

vi.mock('../../../server/utils/crypto', () => ({
    hashPassword: vi.fn().mockImplementation((p) => Promise.resolve(`hashed_${p}`)),
    comparePassword: vi.fn().mockImplementation((p, h) => Promise.resolve(h === `hashed_${p}`))
}))

describe('UserService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createUser', () => {
        it('should hash password and create user', async () => {
            const userData = { username: 'testuser', password: 'password123' }

            await userService.createUser(userData)

            expect(cryptoUtils.hashPassword).toHaveBeenCalledWith('password123')
            expect(userRepository.create).toHaveBeenCalledWith({
                username: 'testuser',
                password: 'hashed_password123'
            })
        })
    })

    describe('authenticate', () => {
        it('should return user if credentials are correct (hashed password)', async () => {
            const mockUser = { email: 'admin@example.com', password: '$2hashed_123456' }
            vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any)
            vi.mocked(cryptoUtils.comparePassword).mockResolvedValue(true)

            const result = await userService.authenticate('admin@example.com', '123456')

            expect(result).toEqual(mockUser)
            expect(cryptoUtils.comparePassword).toHaveBeenCalledWith('123456', '$2hashed_123456')
        })

        it('should return user if credentials are correct (plain password fallback)', async () => {
            const mockUser = { email: 'test@example.com', password: 'plainPassword123' }
            vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any)

            const result = await userService.authenticate('test@example.com', 'plainPassword123')

            expect(result).toEqual(mockUser)
            expect(cryptoUtils.comparePassword).not.toHaveBeenCalled()
        })

        it('should return null if user not found', async () => {
            vi.mocked(userRepository.findByEmail).mockResolvedValue(null)

            const result = await userService.authenticate('unknown@example.com', 'any')

            expect(result).toBeNull()
        })
    })
})
