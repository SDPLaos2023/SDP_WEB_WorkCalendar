import { z } from 'zod'

const TestSchema = z.object({
    name: z.string().min(3),
    age: z.number().int().min(18)
})

export default defineEventHandler(async (event) => {
    const query = getQuery(event)

    // Test 5: RBAC - Require Admin
    if (query.rbac === 'true') {
        await requireAdmin(event)
        return sendSuccess({ role: 'ADMIN' }, 'RBAC Check Passed: You are an Admin')
    }

    // Test 1: Forced error
    if (query.error === 'true') {
        return sendApiError('Test Error Triggered', 418)
    }

    // Test 2: Validation
    if (query.validate === 'true') {
        const body = await validateRequest(event, TestSchema)
        return sendSuccess(body, 'Validation Successful')
    }

    // Test 4: Flaky endpoint for retry testing
    if (query.flaky === 'true') {
        const random = Math.random()
        if (random < 0.7) {
            dbLogger.warn('Simulated Flaky Failure (70% chance)')
            return sendApiError('Simulated Flaky Failure', 500)
        }
        return sendSuccess({
            attempts: query.attempts || 'unknown',
            message: 'Flaky Success!'
        })
    }

    // Test 3: Normal Success
    return sendSuccess({
        message: 'API Infrastructure is working!',
        env: process.env.NODE_ENV
    }, 'Hello from Nuxt API')
})
