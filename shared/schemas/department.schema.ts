import { z } from 'zod'

export const DepartmentSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase()
})

export const DepartmentUpdateSchema = DepartmentSchema.partial()

export type DepartmentInput = z.infer<typeof DepartmentSchema>
export type DepartmentUpdateInput = z.infer<typeof DepartmentUpdateSchema>
