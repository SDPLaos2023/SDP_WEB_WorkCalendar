import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true }
  })
  console.log('Users:', users)

  const tasks = await prisma.planTask.findMany({
    include: {
      assignedTo: { select: { username: true } },
      workPlan: { select: { title: true } }
    }
  })
  console.log('Tasks:', tasks)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
