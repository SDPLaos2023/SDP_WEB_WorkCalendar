import { z } from 'zod'

export const roleEnum = z.enum(['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER', 'SUPERVISOR', 'OFFICER'])

export const createUserSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100),
    username: z.string().min(3, 'Username must be at least 3 characters').max(50),
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(6, 'Password must be at least 6 characters').max(50),
    role: roleEnum.default('OFFICER'),
    departmentId: z.string().uuid().optional().nullable(),
    companyId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().default(true).optional()
})

export const updateUserSchema = createUserSchema.partial()

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type Role = z.infer<typeof roleEnum>
