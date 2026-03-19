import { useAuth } from './useAuth';

export const useReport = () => {
    const { apiFetch } = useAuth()
    const loading = ref(false)
    const error = ref<string | null>(null)

    const fetchReport = async (endpoint: string, params?: any) => {
        loading.value = true
        error.value = null
        try {
            const response = await apiFetch<any>(endpoint, { params })
            if (response && response.success) {
                return response.data
            }
            return null
        } catch (err: any) {
            error.value = err.data?.statusMessage || 'Failed to fetch report data'
            console.error(`[FETCH_REPORT_ERROR][${endpoint}]:`, err)
            throw err
        } finally {
            loading.value = false
        }
    }

    const downloadCSV = async (endpoint: string, params: any = {}, filename: string = 'report.csv') => {
        const { token } = useAuth()
        
        // Build query string
        const queryParams = new URLSearchParams()
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                queryParams.append(key, params[key].toString())
            }
        })
        queryParams.set('format', 'csv')

        const url = `${endpoint}?${queryParams.toString()}`

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token.value}`
                }
            })

            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
             console.error('[DOWNLOAD_CSV_ERROR]:', err)
             error.value = 'Failed to download CSV'
        }
    }

    const downloadBinary = async (endpoint: string, params: any = {}, filename: string = 'export.xlsx') => {
        const { token } = useAuth()
        loading.value = true
        error.value = null
        
        const queryParams = new URLSearchParams()
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                queryParams.append(key, params[key].toString())
            }
        })

        const url = `${endpoint}?${queryParams.toString()}`

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token.value}`
                }
            })

            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err: any) {
             console.error('[DOWNLOAD_BINARY_ERROR]:', err)
             error.value = 'Failed to download file'
        } finally {
            loading.value = false
        }
    }

    return {
        loading,
        error,
        fetchReport,
        downloadCSV,
        downloadBinary
    }
}
