import { PrismaClient } from '@prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

// Initialize Prisma with the adapter as done in the app logic
const adapter = new PrismaMssql({
  server: process.env.DB_SERVER!,
  database: process.env.DB_DATABASE!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  options: {
    trustServerCertificate: true
  }
})

const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash("Admin1234!", 12)

  console.log("🌱 Starting seeding...")

  // 1. Company
  const company = await prisma.company.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      name: "Demo Organization",
      code: "DEMO"
    }
  })
  console.log("✅ Company upserted")

  // 2. Departments
  const itDept = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: "IT" } },
    update: {},
    create: {
      name: "IT Department",
      code: "IT",
      companyId: company.id
    }
  })

  const finDept = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: "FIN" } },
    update: {},
    create: {
      name: "Finance Department",
      code: "FIN",
      companyId: company.id
    }
  })

  await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: "HR" } },
    update: {},
    create: {
      name: "HR Department",
      code: "HR",
      companyId: company.id
    }
  })
  console.log("✅ Departments upserted")

  // 3. Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "super@demo.com" },
    update: { password: passwordHash },
    create: {
      username: "superadmin",
      email: "super@demo.com",
      firstName: "Super",
      lastName: "Admin",
      password: passwordHash,
      role: "SUPER_ADMIN",
      companyId: company.id
    }
  })

  const companyAdmin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: { password: passwordHash },
    create: {
      username: "companyadmin",
      email: "admin@demo.com",
      firstName: "Company",
      lastName: "Admin",
      password: passwordHash,
      role: "ADMIN_COMPANY",
      companyId: company.id
    }
  })

  const itManager = await prisma.user.upsert({
    where: { email: "manager@demo.com" },
    update: { password: passwordHash, departmentId: itDept.id },
    create: {
      username: "manager",
      email: "manager@demo.com",
      firstName: "IT",
      lastName: "Manager",
      password: passwordHash,
      role: "MANAGER",
      companyId: company.id,
      departmentId: itDept.id
    }
  })

  const officer1 = await prisma.user.upsert({
    where: { email: "officer1@demo.com" },
    update: { password: passwordHash, departmentId: itDept.id },
    create: {
      username: "officer1",
      email: "officer1@demo.com",
      firstName: "Officer",
      lastName: "One",
      password: passwordHash,
      role: "OFFICER",
      companyId: company.id,
      departmentId: itDept.id
    }
  })

  const officer2 = await prisma.user.upsert({
    where: { email: "officer2@demo.com" },
    update: { password: passwordHash, departmentId: itDept.id },
    create: {
      username: "officer2",
      email: "officer2@demo.com",
      firstName: "Officer",
      lastName: "Two",
      password: passwordHash,
      role: "OFFICER",
      companyId: company.id,
      departmentId: itDept.id
    }
  })
  console.log("✅ Users upserted")

  // 4. WorkPlans
  const itPlan = await prisma.workPlan.upsert({
    where: { departmentId_year: { departmentId: itDept.id, year: 2025 } },
    update: { status: "ACTIVE" },
    create: {
      title: "IT Infrastructure 2025",
      departmentId: itDept.id,
      year: 2025,
      planStartDate: new Date("2025-01-01"),
      planEndDate: new Date("2025-12-31"),
      status: "ACTIVE",
      totalDays: 365,
      createdById: itManager.id
    }
  })

  await prisma.workPlan.upsert({
    where: { departmentId_year: { departmentId: finDept.id, year: 2025 } },
    update: { status: "DRAFT" },
    create: {
      title: "Finance Budget 2025",
      departmentId: finDept.id,
      year: 2025,
      planStartDate: new Date("2025-01-01"),
      planEndDate: new Date("2025-12-31"),
      status: "DRAFT",
      totalDays: 365,
      createdById: companyAdmin.id
    }
  })
  console.log("✅ WorkPlans upserted")

  // 5. PlanTasks
  const tasksData = [
    {
      taskName: "SERVER UPGRADE Q1",
      taskType: "PROJECT",
      priority: "HIGH",
      plannedStart: new Date("2025-01-01"),
      plannedEnd: new Date("2025-03-31"),
      assignedToId: officer1.id,
      plannedDays: 90
    },
    {
      taskName: "NETWORK AUDIT",
      taskType: "PROJECT",
      priority: "MEDIUM",
      plannedStart: new Date("2025-04-01"),
      plannedEnd: new Date("2025-06-30"),
      assignedToId: officer2.id,
      plannedDays: 91
    },
    {
      taskName: "DAILY SERVER HEALTH CHECK",
      taskType: "ROUTINE",
      priority: "HIGH",
      isRecurring: true,
      recurrenceType: "DAILY",
      recurrenceStart: new Date("2025-01-01"),
      recurrenceEnd: new Date("2025-12-31"),
      assignedToId: officer1.id
    },
    {
      taskName: "WEEKLY SECURITY SCAN",
      taskType: "ROUTINE",
      priority: "HIGH",
      isRecurring: true,
      recurrenceType: "WEEKLY",
      recurrenceStart: new Date("2025-01-01"),
      recurrenceEnd: new Date("2025-12-31"),
      assignedToId: officer2.id
    }
  ]

  const createdTasks: Record<string, any> = {}

  for (const t of tasksData) {
    const existing = await prisma.planTask.findFirst({
      where: { workPlanId: itPlan.id, taskName: t.taskName }
    })

    if (existing) {
        createdTasks[t.taskName] = existing
    } else {
        createdTasks[t.taskName] = await prisma.planTask.create({
            data: {
              ...t,
              workPlanId: itPlan.id,
              createdById: itManager.id,
              status: "PENDING"
            }
        })
    }
  }
  console.log("✅ PlanTasks upserted")

  // 6. TaskActuals
  const healthCheckTask = createdTasks["DAILY SERVER HEALTH CHECK"]
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() - i)

    const existing = await prisma.taskActual.findFirst({
        where: { planTaskId: healthCheckTask.id, actualDate: d }
    })

    if (!existing) {
        await prisma.taskActual.create({
            data: {
                planTaskId: healthCheckTask.id,
                updatedById: officer1.id,
                updateType: "DAILY",
                actualDate: d,
                completionPct: 100,
                status: "DONE",
                note: "Verified health status."
            }
        })
    }
  }

  const securityScanTask = createdTasks["WEEKLY SECURITY SCAN"]
  for (let i = 0; i < 4; i++) {
    const d = new Date()
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() - (i * 7))

    const existing = await prisma.taskActual.findFirst({
        where: { planTaskId: securityScanTask.id, actualDate: d }
    })

    if (!existing) {
        await prisma.taskActual.create({
            data: {
                planTaskId: securityScanTask.id,
                updatedById: officer2.id,
                updateType: "WEEKLY",
                actualDate: d,
                completionPct: 100,
                status: "DONE",
                note: "Scan completed."
            }
        })
    }
  }

  const serverUpgradeTask = createdTasks["SERVER UPGRADE Q1"]
  const upgradeRecords = [
      { date: new Date("2025-03-01"), pct: 40, status: "PARTIAL" },
      { date: new Date("2025-03-10"), pct: 75, status: "PARTIAL" }
  ]

  for (const rec of upgradeRecords) {
    const existing = await prisma.taskActual.findFirst({
        where: { planTaskId: serverUpgradeTask.id, actualDate: rec.date }
    })
    if (!existing) {
        await prisma.taskActual.create({
            data: {
                planTaskId: serverUpgradeTask.id,
                updatedById: officer1.id,
                updateType: "DAILY",
                actualDate: rec.date,
                completionPct: rec.pct,
                status: rec.status,
                note: `Progress at ${rec.pct}%`
            }
        })
    }
  }
  console.log("✅ TaskActuals seeded")

  console.log("✅ Seed complete")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
