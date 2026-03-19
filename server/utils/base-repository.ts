import prisma from './prisma'
import type { PaginationOptions } from './pagination'
import { paginate } from './pagination'

export class BaseRepository<T> {
    protected model: any
    protected db = prisma

    constructor(model: any) {
        this.model = model
    }

    /**
     * executeRaw: For complex JOINs and optimized SQL
     */
    async queryRaw<R = any>(query: string, ...values: any[]): Promise<R> {
        return this.db.$queryRawUnsafe<R>(query, ...values)
    }

    async findAll(options: { where?: any; orderBy?: any; include?: any; select?: any } = {}) {
        return this.model.findMany(options)
    }

    async findById(id: number | string, include?: any) {
        return this.model.findUnique({
            where: { id },
            include
        })
    }

    async findPaginated(options: PaginationOptions) {
        return paginate(this.model, options)
    }

    async create(data: any) {
        return this.model.create({ data })
    }

    async update(id: number | string, data: any) {
        return this.model.update({
            where: { id },
            data
        })
    }

    async delete(id: number | string) {
        return this.model.delete({
            where: { id }
        })
    }

    async count(where?: any) {
        return this.model.count({ where })
    }
}
