import { z } from 'zod'

export const createActualSchema = z.object({
    updateType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    actualDate: z.string().min(1, 'Actual date is required'),
    actualStart: z.string().optional().nullable(),
    actualEnd: z.string().optional().nullable(),
    actualDays: z.number().int().min(1).optional().nullable(),
    completionPct: z.number().min(0, 'Completion must be at least 0').max(100, 'Completion cannot exceed 100'),
    status: z.enum(['DONE', 'PARTIAL', 'NOT_DONE']),
    note: z.string().optional().nullable(),
    attachmentUrl: z.string().url().optional().nullable()
})

export const updateActualSchema = createActualSchema.partial()

export type CreateActualInput = z.infer<typeof createActualSchema>
export type UpdateActualInput = z.infer<typeof updateActualSchema>
