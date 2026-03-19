import { prisma } from '../server/utils/prisma'

async function main() {
  const tasks = await prisma.planTask.findMany({
    include: {
      workPlan: {
        include: {
          department: true
        }
      }
    }
  })
  console.log(JSON.stringify(tasks, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
