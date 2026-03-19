import { apiLogger } from './logger'

export interface ApiResponse<T = any> {
    success: boolean
    message?: string
    data?: T
    meta?: {
        total?: number
        page?: number
        pageSize?: number
        totalPages?: number
        [key: string]: any
    }
    errors?: any
}

export const sendSuccess = <T>(data: T, message?: string, meta?: any): ApiResponse<T> => {
    return {
        success: true,
        message,
        data,
        meta
    }
}

export const sendApiError = (message: string, statusCode: number = 400, errors?: any) => {
    // Log the error for server-side visibility
    apiLogger.error(`[${statusCode}] ${message}`, errors || '')

    throw createError({
        statusCode,
        statusMessage: message,
        data: {
            success: false,
            message,
            errors
        }
    })
}
