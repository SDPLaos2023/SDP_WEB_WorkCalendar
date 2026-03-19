import { z } from 'zod'

export const CompanySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200),
    code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase()
})

export const CompanyUpdateSchema = CompanySchema.partial()

export type CompanyInput = z.infer<typeof CompanySchema>
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateSchema>
