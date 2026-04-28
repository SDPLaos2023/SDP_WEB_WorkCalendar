import { format } from 'date-fns'

/**
 * Formats a date to DD/MM/YYYY
 * @param date - Date to format (Date object, string, or number)
 * @param formatStr - Format string (default: 'dd/MM/yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number | null | undefined, formatStr: string = 'dd/MM/yyyy'): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    return format(d, formatStr)
  } catch (error) {
    return '-'
  }
}
