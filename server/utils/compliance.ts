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
        recurrenceDay: number | null,
        plannedWeeks?: string | null
    },
    actuals: { actualDate: Date }[]
): ComplianceSummary | null {
    if (!task.recurrenceStart || !task.recurrenceType) return null

    const completedPeriods = actuals.length
    let expectedPeriods = 0
    let missedDates: string[] = []

    // Use plannedWeeks if available (Annual Work Plan Grid)
    if (task.plannedWeeks) {
        try {
            const weeks = JSON.parse(task.plannedWeeks)
            if (Array.isArray(weeks) && weeks.length > 0) {
                expectedPeriods = weeks.length
                
                // We can't easily map actual dates to specific grid weeks without
                // complex date math, so we just use the raw count.
                // missedDates is less relevant here, so we leave it empty.
            }
        } catch (e) {
            console.error("Failed to parse plannedWeeks", e)
        }
    }

    // Fallback to date loop logic if no plannedWeeks or empty
    if (expectedPeriods === 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const startDate = new Date(task.recurrenceStart)
        startDate.setHours(0, 0, 0, 0)

        const endDate = task.recurrenceEnd ? new Date(task.recurrenceEnd) : today
        endDate.setHours(0, 0, 0, 0)

        // Bound the calculation up to today
        const limitDate = today < endDate ? today : endDate

        const isMonthlyPlus = ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(task.recurrenceType!)

        const actualDateStrings = new Set(actuals.map(a => {
            const d = new Date(a.actualDate)
            d.setHours(0, 0, 0, 0)
            if (isMonthlyPlus) d.setDate(1)
            return d.toISOString()
        }))

        let current = new Date(startDate)
        if (isMonthlyPlus) current.setDate(1)

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
                break;
            }
        }
    }

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
