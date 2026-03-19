import { prisma } from './prisma'
import { calculateCompliance } from './compliance'

/**
 * Re-calculates and updates materialized stats for a PlanTask
 * This should be called whenever a TaskActual is created, updated or deleted.
 */
export async function updateTaskMaterializedStats(taskId: string, tx?: any) {
  const db = tx || prisma

  // 1. Fetch task with all actuals
  const task = await db.planTask.findUnique({
    where: { id: taskId },
    include: {
      actuals: {
        orderBy: { actualDate: 'desc' },
        where: { deletedAt: null }
      }
    }
  })

  if (!task) return

  let compliancePct = 0
  let currentCompletionPct = 0

  if (task.taskType === 'PROJECT') {
    // For PROJECT tasks: use the latest actual's completionPct
    const latestActual = task.actuals[0]
    currentCompletionPct = latestActual ? Number(latestActual.completionPct) : 0
    compliancePct = 0 // Not applicable for projects
  } else if (task.taskType === 'ROUTINE') {
    // For ROUTINE tasks: calculate compliance
    const compliance = calculateCompliance(task as any, task.actuals)
    compliancePct = compliance ? compliance.compliancePct : 100
    currentCompletionPct = 0 // Not typically used for routine in the same way
  }

  // 2. Update the task with calculated values
  await db.planTask.update({
    where: { id: taskId },
    data: {
      compliancePct,
      currentCompletionPct
    }
  })
}
