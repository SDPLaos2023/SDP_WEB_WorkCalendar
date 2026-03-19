import { z } from 'zod'

const baseWorkPlanSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(500),
    description: z.string().optional().nullable(),
    year: z.number().int().min(2000).max(2100),
    planStartDate: z.string().min(1, 'Start date is required'),
    planEndDate: z.string().min(1, 'End date is required'),
    departmentId: z.string().uuid(),
    supervisorIds: z.array(z.string().uuid()).optional()
})

export const createWorkPlanSchema = baseWorkPlanSchema.refine((data) => new Date(data.planEndDate) >= new Date(data.planStartDate), {
    message: 'Plan end date must be after or equal to start date',
    path: ['planEndDate']
})

export const updateWorkPlanSchema = baseWorkPlanSchema.partial().refine((data) => {
    if (data.planStartDate && data.planEndDate) {
        return new Date(data.planEndDate) >= new Date(data.planStartDate)
    }
    return true
}, {
    message: 'Plan end date must be after or equal to start date',
    path: ['planEndDate']
})

export const statusTransitionSchema = z.object({
    status: z.enum(['ACTIVE', 'CLOSED'])
})

export type CreateWorkPlanInput = z.infer<typeof createWorkPlanSchema>
export type UpdateWorkPlanInput = z.infer<typeof updateWorkPlanSchema>
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>
