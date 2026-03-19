import type { UseFetchOptions } from '#app'
import type { ApiResponse } from '~~/server/utils/api-response'

/**
 * useApi: A wrapper around useFetch to handle standardized API responses
 */
export const useApi = <T>(
    url: string | (() => string),
    options: UseFetchOptions<ApiResponse<T>> = {}
) => {
    const toast = useToast()

    return useFetch(url, {
        retry: 3,             // Retry 3 times on failure
        retryDelay: 1000,     // Wait 1 second between retries
        ...options,
        // Add default behavior for error handling
        onResponseError({ response }) {
            const errorMsg = response._data?.message || 'Something went wrong'
            toast.add({
                title: 'ຜິດພາດ',
                description: errorMsg,
                color: 'error',
                icon: 'i-heroicons-exclamation-circle'
            })
        }
    })
}

/**
 * useApiAction: For one-off actions (POST/PUT/DELETE)
 * Handles loading state, toast notifications, and optional retries
 */
export const useApiAction = () => {
    const toast = useToast()
    const loading = ref(false)

    const execute = async <T>(
        requestFn: () => Promise<ApiResponse<T>>, // Pass a function that returns the promise
        options: { successMessage?: string; retry?: number; retryDelay?: number } = {}
    ): Promise<{ data: T | null; error: any }> => {
        const { successMessage, retry = 0, retryDelay = 1000 } = options
        loading.value = true

        try {
            let attempts = 0
            while (attempts <= retry) {
                try {
                    const response = await requestFn()
                    if (successMessage) {
                        toast.add({
                            title: 'ສຳເລັດ',
                            description: successMessage,
                            color: 'success',
                            icon: 'i-heroicons-check-circle'
                        })
                    }
                    return { data: response.data as T, error: null }
                } catch (err: any) {
                    attempts++

                    if (attempts <= retry && (err.statusCode >= 500 || !err.statusCode)) {
                        await new Promise(resolve => setTimeout(resolve, retryDelay))
                        continue
                    }

                    const errorMsg = err.data?.message || err.message || 'Action failed'
                    toast.add({
                        title: 'ຜິດພາດ',
                        description: errorMsg,
                        color: 'error',
                        icon: 'i-heroicons-exclamation-circle'
                    })
                    return { data: null, error: err }
                }
            }
            return { data: null, error: new Error('Max retries reached and action failed') }
        } finally {
            loading.value = false
        }
    }

    return {
        execute,
        loading
    }
}
