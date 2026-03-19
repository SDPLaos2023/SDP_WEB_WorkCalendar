import { prisma } from '../server/utils/prisma'
import { updateTaskMaterializedStats } from '../server/utils/materialized-stats'

async function main() {
  console.log('--- Starting Stats Repopulation ---')
  
  const tasks = await prisma.planTask.findMany({
    where: { deletedAt: null },
    select: { id: true }
  })
  
  console.log(`Found ${tasks.length} tasks to process.`)
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    process.stdout.write(`Processing task ${i + 1}/${tasks.length}... \r`)
    await updateTaskMaterializedStats(task.id)
  }
  
  console.log('\n--- Finished Stats Repopulation ---')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
