import { userRepository } from '../utils/repositories'
import { hashPassword, comparePassword } from '../utils/crypto'

export class UserService {
    async getUsers(params: { page: number; pageSize: number; search?: string; role?: string }) {
        const { page, pageSize, search, role } = params

        const where: any = {}
        if (search) {
            where.OR = [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { email: { contains: search } }
            ]
        }
        if (role && role !== 'all') {
            where.role = role
        }

        return await userRepository.findPaginated({
            page,
            pageSize,
            where,
            orderBy: { id: 'desc' }
        })
    }

    async createUser(data: any) {
        // Check duplicates logic could be here or in controller
        // Encryption/Hashing is a service responsibility
        if (data.password) {
            data.password = await hashPassword(data.password)
        }
        return await userRepository.create(data)
    }

    async updateUser(id: number, data: any) {
        if (data.password) {
            data.password = await hashPassword(data.password)
        }
        return await userRepository.update(id, data)
    }

    async deleteUser(id: number) {
        return await userRepository.delete(id)
    }

    async authenticate(email: string, passwordFromClient: string) {
        const user = await userRepository.findByEmail(email)
        if (!user) return null

        let isMatch = false
        if (user.password.startsWith('$2')) {
            isMatch = await comparePassword(passwordFromClient, user.password)
        } else {
            isMatch = user.password === passwordFromClient
        }

        return isMatch ? user : null
    }
}

export const userService = new UserService()
