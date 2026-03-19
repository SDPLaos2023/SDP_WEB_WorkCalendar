import { prisma } from './prisma'

interface QueuedAudit {
  userId: string | null
  action: string
  tableName: string
  recordId: string | null
  oldValues: string | null
  newValues: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

let buffer: QueuedAudit[] = []
let isProcessing = false
const BATCH_SIZE = 50
const FLUSH_INTERVAL = 5000 // 5 seconds

export function enqueueAudit(data: QueuedAudit) {
  buffer.push(data)
  
  if (buffer.length >= BATCH_SIZE) {
    flushBuffer()
  }
}

async function flushBuffer() {
  if (isProcessing || buffer.length === 0) return
  
  isProcessing = true
  const currentBatch = [...buffer]
  buffer = []
  
  try {
    await prisma.auditLog.createMany({
      data: currentBatch
    })
  } catch (err) {
    console.error('[AUDIT_BUFFER_FLUSH_ERROR]:', err)
    // Put back to buffer if failed? For now just log.
  } finally {
    isProcessing = false
  }
}

// Start interval
setInterval(flushBuffer, FLUSH_INTERVAL)
