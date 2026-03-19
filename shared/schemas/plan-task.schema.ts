import { z } from 'zod'

const baseTaskSchema = z.object({
    taskName: z.string().min(2, 'Task name must be at least 2 characters').max(500),
    description: z.string().optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    assignedToId: z.string().uuid().optional().nullable(),
    supervisorId: z.string().uuid().optional().nullable(),
    plannedWeeks: z.string().optional().nullable()
})

export const projectTaskSchema = baseTaskSchema.extend({
    taskType: z.literal('PROJECT'),
    plannedStart: z.string().min(1, 'Start date is required'),
    plannedEnd: z.string().min(1, 'End date is required'),
}).refine((data) => new Date(data.plannedEnd) >= new Date(data.plannedStart), {
    message: 'Planned end date must be after or equal to start date',
    path: ['plannedEnd']
})

export const routineTaskSchema = baseTaskSchema.extend({
    taskType: z.literal('ROUTINE'),
    recurrenceType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    recurrenceDay: z.number().int().min(1).max(31).optional().nullable(),
    recurrenceStart: z.string().min(1, 'Start date is required'),
    recurrenceEnd: z.string().min(1, 'End date is required'),
})

export const createPlanTaskSchema = z.discriminatedUnion('taskType', [
    projectTaskSchema,
    routineTaskSchema
])

export const updatePlanTaskSchema = z.object({
    taskName: z.string().min(2).max(500).optional(),
    description: z.string().optional().nullable(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignedToId: z.string().uuid().optional().nullable(),
    supervisorId: z.string().uuid().optional().nullable(),
    plannedStart: z.string().optional(),
    plannedEnd: z.string().optional(),
    recurrenceType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
    recurrenceDay: z.number().int().min(1).max(31).optional().nullable(),
    recurrenceStart: z.string().optional(),
    recurrenceEnd: z.string().optional(),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    plannedWeeks: z.string().optional().nullable()
})

export type CreatePlanTaskInput = z.infer<typeof createPlanTaskSchema>
export type UpdatePlanTaskInput = z.infer<typeof updatePlanTaskSchema>
