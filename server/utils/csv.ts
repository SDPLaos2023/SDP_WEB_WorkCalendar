/**
 * Simple CSV generator helper
 */
export function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = []

    // Header row
    csvRows.push(headers.join(','))

    // Data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header]
            const escaped = ('' + val).replace(/"/g, '""')
            return `"${escaped}"`
        })
        csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
}
