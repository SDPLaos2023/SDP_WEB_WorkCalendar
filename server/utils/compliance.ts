/**
 * Utility to calculate compliance for ROUTINE tasks
 * Comparison between planned recurrence periods and reported TaskActuals
 */
export interface ComplianceSummary {
    expectedPeriods: number
    completedPeriods: number
    compliancePct: number
    missedDates: string[]
}

export function calculateCompliance(
    task: {
        recurrenceType: string | null,
        recurrenceStart: Date | null,
        recurrenceEnd: Date | null,
        recurrenceDay: number | null
    },
    actuals: { actualDate: Date }[]
): ComplianceSummary | null {
    if (!task.recurrenceStart || !task.recurrenceType) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDate = new Date(task.recurrenceStart)
    startDate.setHours(0, 0, 0, 0)

    const endDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : today
    endDate.setHours(0, 0, 0, 0)

    // Bound the calculation up to today
    const limitDate = today < endDate ? today : endDate

    const actualDateStrings = new Set(actuals.map(a => {
        const d = new Date(a.actualDate)
        d.setHours(0, 0, 0, 0)
        return d.toISOString()
    }))

    const missedDates: string[] = []
    let expectedPeriods = 0
    let current = new Date(startDate)

    while (current <= limitDate) {
        expectedPeriods++
        const currentStr = current.toISOString()

        if (!actualDateStrings.has(currentStr)) {
            missedDates.push(currentStr)
        }

        // Advance based on recurrence type
        if (task.recurrenceType === 'DAILY') {
            current.setDate(current.getDate() + 1)
        } else if (task.recurrenceType === 'WEEKLY') {
            current.setDate(current.getDate() + 7)
        } else if (task.recurrenceType === 'MONTHLY') {
            current.setMonth(current.getMonth() + 1)
        } else if (task.recurrenceType === 'QUARTERLY') {
            current.setMonth(current.getMonth() + 3)
        } else if (task.recurrenceType === 'YEARLY') {
            current.setFullYear(current.getFullYear() + 1)
        } else {
            break; // Should not happen
        }
    }

    const completedPeriods = actuals.length
    const compliancePct = expectedPeriods > 0
        ? Math.round((completedPeriods / expectedPeriods) * 10000) / 100
        : 100

    return {
        expectedPeriods,
        completedPeriods,
        compliancePct: Math.min(100, compliancePct),
        missedDates
    }
}
