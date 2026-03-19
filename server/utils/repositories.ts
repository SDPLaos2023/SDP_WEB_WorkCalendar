import { BaseRepository } from './base-repository'
import prisma from './prisma'

export class UserRepository extends BaseRepository<any> {
    constructor() {
        super(prisma.user)
    }

    // Custom logic for User
    async findByEmail(email: string) {
        return this.model.findUnique({
            where: { email }
        })
    }


    async updatePassword(id: number, newPasswordHash: string) {
        return this.model.update({
            where: { id },
            data: { password: newPasswordHash }
        })
    }
}

/*
export class CustomerRepository extends BaseRepository<any> {
    constructor() {
        super(prisma.customer)
    }

    async findByEmail(email: string) {
        return this.model.findUnique({
            where: { email }
        })
    }
}
*/

// Export singleton instances
export const userRepository = new UserRepository()
// export const customerRepository = new CustomerRepository()
