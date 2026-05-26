import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getUser } from '../../utils/auth-helpers'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
])

const sanitizeName = (filename: string): string => {
    const ext = path.extname(filename || '').toLowerCase()
    const base = path.basename(filename || 'attachment', ext)
    const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'attachment'
    return `${cleanBase}${ext}`
}

export default defineEventHandler(async (event) => {
    try {
        getUser(event)

        const files = await readMultipartFormData(event)
        if (!files || files.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
        }

        const file = files.find(part => part.name === 'file')
        if (!file || !file.data) {
            throw createError({ statusCode: 400, statusMessage: 'Invalid upload payload' })
        }

        if (file.data.length > MAX_FILE_SIZE) {
            throw createError({ statusCode: 400, statusMessage: 'File is too large (max 10MB)' })
        }

        const contentType = (file.type || '').toLowerCase()
        if (!ALLOWED_MIME_TYPES.has(contentType)) {
            throw createError({ statusCode: 400, statusMessage: 'Unsupported file type' })
        }

        const safeName = sanitizeName(file.filename || 'attachment')
        const storedName = `${Date.now()}-${randomUUID()}-${safeName}`
        const relativeDir = path.join('storage', 'task-actuals')
        const targetDir = path.join(process.cwd(), relativeDir)
        const targetPath = path.join(targetDir, storedName)

        await fs.mkdir(targetDir, { recursive: true })
        await fs.writeFile(targetPath, file.data)

        return {
            success: true,
            data: {
                attachmentUrl: `/uploads/task-actuals/${storedName}`,
                filename: file.filename || safeName,
                mimeType: contentType,
                size: file.data.length
            }
        }
    } catch (error: any) {
        if (error.statusCode) throw error
        console.error('[TASK_ACTUAL_UPLOAD_ERROR]:', error)
        throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
})
