import { apiLogger } from '../utils/logger'

export default defineEventHandler((event) => {
    const start = Date.now()
    const { method, url } = event.node.req

    // Use the Node.js response finish event
    event.node.res.on('finish', () => {
        const duration = Date.now() - start
        const statusCode = event.node.res.statusCode

        const logMsg = `${method} ${url} - ${statusCode} (${duration}ms)`

        if (statusCode >= 500) {
            apiLogger.error(logMsg)
        } else if (statusCode >= 400) {
            apiLogger.warn(logMsg)
        } else {
            apiLogger.info(logMsg)
        }
    })
})
