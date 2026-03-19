import { describe, it, expect } from 'vitest'
import { calculateCompliance } from '../../../server/utils/compliance'

describe('calculateCompliance', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    it('should return null if recurrenceStart or recurrenceType is missing', () => {
        expect(calculateCompliance({ recurrenceType: null, recurrenceStart: null, recurrenceEnd: null, recurrenceDay: null }, [])).toBeNull()
        expect(calculateCompliance({ recurrenceType: 'DAILY', recurrenceStart: null, recurrenceEnd: null, recurrenceDay: null }, [])).toBeNull()
    })

    describe('DAILY recurrence', () => {
        it('TC-COMP-01: should return 100% compliance if all actuals are present', () => {
            const start = new Date(today)
            start.setDate(today.getDate() - 6) // 7 days including today

            const actuals = []
            for (let i = 0; i < 7; i++) {
                const date = new Date(start)
                date.setDate(start.getDate() + i)
                actuals.push({ actualDate: date })
            }

            const result = calculateCompliance({
                recurrenceType: 'DAILY',
                recurrenceStart: start,
                recurrenceEnd: null,
                recurrenceDay: null
            }, actuals)

            expect(result?.expectedPeriods).toBe(7)
            expect(result?.completedPeriods).toBe(7)
            expect(result?.compliancePct).toBe(100)
            expect(result?.missedDates).toHaveLength(0)
        })

        it('TC-COMP-02: should return 0% compliance if no actuals are present', () => {
            const start = new Date(today)
            start.setDate(today.getDate() - 6)

            const result = calculateCompliance({
                recurrenceType: 'DAILY',
                recurrenceStart: start,
                recurrenceEnd: null,
                recurrenceDay: null
            }, [])

            expect(result?.expectedPeriods).toBe(7)
            expect(result?.completedPeriods).toBe(0)
            expect(result?.compliancePct).toBe(0)
            expect(result?.missedDates).toHaveLength(7)
        })

        it('TC-COMP-03: should return 50% compliance if half of actuals are present', () => {
            const start = new Date(today)
            start.setDate(today.getDate() - 9) // 10 days

            const actuals = []
            for (let i = 0; i < 5; i++) {
                const date = new Date(start)
                date.setDate(start.getDate() + i)
                actuals.push({ actualDate: date })
            }

            const result = calculateCompliance({
                recurrenceType: 'DAILY',
                recurrenceStart: start,
                recurrenceEnd: null,
                recurrenceDay: null
            }, actuals)

            expect(result?.expectedPeriods).toBe(10)
            expect(result?.completedPeriods).toBe(5)
            expect(result?.compliancePct).toBe(50)
            expect(result?.missedDates).toHaveLength(5)
        })
    })

    describe('WEEKLY recurrence', () => {
        it('TC-COMP-04: should calculate correctly for weekly tasks', () => {
            const start = new Date(today)
            start.setDate(today.getDate() - 21) // 4 weeks ago

            const actuals = [
                { actualDate: new Date(start) },
                { actualDate: new Date(new Date(start).setDate(start.getDate() + 7)) },
                { actualDate: new Date(new Date(start).setDate(start.getDate() + 14)) },
                { actualDate: new Date(new Date(start).setDate(start.getDate() + 21)) }
            ]

            const result = calculateCompliance({
                recurrenceType: 'WEEKLY',
                recurrenceStart: start,
                recurrenceEnd: null,
                recurrenceDay: null
            }, actuals)

            expect(result?.expectedPeriods).toBe(4)
            expect(result?.completedPeriods).toBe(4)
            expect(result?.compliancePct).toBe(100)
        })
    })

    describe('MONTHLY recurrence', () => {
        it('TC-COMP-05: should calculate correctly for monthly tasks', () => {
            const start = new Date(today)
            start.setMonth(today.getMonth() - 2) // 3 months ago (this month, last month, month before)
            
            // Assume 3 reports
            const actuals = [
                { actualDate: new Date(start) },
                { actualDate: new Date(new Date(start).setMonth(start.getMonth() + 1)) },
                { actualDate: new Date(new Date(start).setMonth(start.getMonth() + 2)) }
            ]

            const result = calculateCompliance({
                recurrenceType: 'MONTHLY',
                recurrenceStart: start,
                recurrenceEnd: null,
                recurrenceDay: null
            }, actuals)

            expect(result?.expectedPeriods).toBe(3)
            expect(result?.completedPeriods).toBe(3)
            expect(result?.compliancePct).toBe(100)
        })
    })

    it('TC-COMP-07: should cap compliance at 100% even if extra reports are present', () => {
        const start = new Date(today)
        
        const actuals = [
            { actualDate: new Date(today) },
            { actualDate: new Date(today) } // Duplicate/Extra
        ]

        const result = calculateCompliance({
            recurrenceType: 'DAILY',
            recurrenceStart: start,
            recurrenceEnd: null,
            recurrenceDay: null
        }, actuals)

        expect(result?.expectedPeriods).toBe(1)
        expect(result?.completedPeriods).toBe(2)
        expect(result?.compliancePct).toBe(100)
    })
})
