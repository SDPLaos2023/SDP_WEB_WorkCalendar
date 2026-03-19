import type { PrismaClient } from '@prisma/client'

/**
 * Fast Pagination using Cursor-based approach or Optimized Offset-based
 * สำหรับ SQL Server แนะนำใช้ Cursor-based หากข้อมูลมีจำนวนมหาศาล
 * แต่หากต้องการใช้ Offset (Skip/Take) ให้ใช้การดึง ID มาก่อนแล้วค่อยดึง Data ลำดับที่ต้องการ
 */

export interface PaginationOptions {
    page: number
    pageSize: number
    where?: any
    orderBy?: any
    include?: any
    select?: any
}

// 1. Optimized Offset-based (มาตรฐานที่เร็วพอสำหรับข้อมูลทั่วไป)
export async function paginate<T>(
    model: any,
    options: PaginationOptions
) {
    const { page, pageSize, where, orderBy, include, select } = options
    const skip = (page - 1) * pageSize

    // ใช้ Promise.all เพื่อรัน count และ query พร้อมกัน (ลด latency)
    const [total, data] = await Promise.all([
        model.count({ where }),
        model.findMany({
            where,
            orderBy,
            include,
            select,
            skip,
            take: pageSize,
        })
    ])

    return {
        data,
        meta: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        }
    }
}

/**
 * 2. Optimized Keyset Pagination (เร็วที่สุดสำหรับข้อมูลจำนวนมากระดับล้านแถว)
 * เหมาะสำหรับ Infinite Scroll หรือหน้าที่มีปุ่ม "Next" อย่างเดียว
 * โดยใช้ไอดีล่าสุดตัวสุดท้าย (cursorId) เป็นจุดเริ่มต้นในการดึงรอบถัดไป
 */
export async function paginateCursor<T>(
    model: any,
    options: {
        cursorId?: number | string
        pageSize: number
        where?: any
        orderBy?: any
    }
) {
    const { cursorId, pageSize, where, orderBy } = options

    const data = await model.findMany({
        where,
        take: pageSize + 1, // ดึงเกินมา 1 เพื่อเช็คว่ามีหน้าถัดไปไหม
        cursor: cursorId ? { id: cursorId } : undefined,
        skip: cursorId ? 1 : 0, // ถ้ามี cursor ให้ข้ามตัวมันเองไป 1
        orderBy: orderBy || { id: 'asc' },
    })

    let nextCursor: typeof cursorId | undefined = undefined
    if (data.length > pageSize) {
        const nextItem = data.pop()
        nextCursor = nextItem.id
    }

    return {
        data,
        nextCursor
    }
}
