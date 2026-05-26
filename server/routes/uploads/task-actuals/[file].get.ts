import { promises as fs } from 'node:fs'
import path from 'node:path'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export default defineEventHandler(async (event) => {
  try {
    const file = getRouterParam(event, 'file')
    if (!file) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid file path' })
    }

    const safeFile = path.basename(file)
    if (safeFile !== file) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid file name' })
    }

    const storagePath = path.join(process.cwd(), 'storage', 'task-actuals', safeFile)
    const legacyPublicPath = path.join(process.cwd(), 'public', 'uploads', 'task-actuals', safeFile)

    let fileBuffer: Buffer
    let resolvedPath = storagePath
    try {
      fileBuffer = await fs.readFile(storagePath)
    } catch {
      fileBuffer = await fs.readFile(legacyPublicPath)
      resolvedPath = legacyPublicPath
    }

    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = MIME_BY_EXT[ext] || 'application/octet-stream'

    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Content-Disposition', `inline; filename="${safeFile}"`)
    return fileBuffer
  } catch (error: any) {
    if (error?.statusCode) throw error
    if (error?.code === 'ENOENT') {
      throw createError({ statusCode: 404, statusMessage: 'File not found' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
