import { createConsola } from 'consola'

/**
 * Custom Logger using Consola
 * This provides pretty terminal logs in Dev and structured logs in Prod
 */
export const logger = createConsola({
    level: process.env.NODE_ENV === 'production' ? 3 : 4, // 3: info, 4: debug
    reporters: [], // Consola will use default terminal reporter
})

export const apiLogger = logger.withTag('API')
export const dbLogger = logger.withTag('DB')
export const authLogger = logger.withTag('AUTH')

export default logger
