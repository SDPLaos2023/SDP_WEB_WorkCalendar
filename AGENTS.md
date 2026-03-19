# AGENTS.md — WorkCalendar Project Context

> Read this file in full before writing any code.
> This is a full-stack project. Frontend and Backend live in the same Nuxt 4 repo.

---

## 1. Project Overview

**WorkCalendar** is an annual work planning and tracking system for organizations.

Core idea:
- A **Manager** creates a **Work Plan** for their department each year
- The plan contains **Tasks** — either one-time (Project) or recurring (Routine)
- **Officers** log daily/weekly/monthly progress against their assigned tasks
- Management views **dashboards** showing completion % and compliance %

---

## 2. Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Full-stack    | Nuxt 4 (Vue 3 + Nitro)              |
| Runtime       | Bun                                 |
| UI Library    | Nuxt UI                        |
| State         | useState (Nuxt built-in composable) |
| ORM           | Prisma                         |
| Database      | SQL Server                          |
| Auth          | JWT (access 15m + refresh 7d)       |
| Validation    | Zod (shared between client/server)  |

---

## 4. Domain Concepts

### 4.1 Work Plan
- Multiple work plans per **department** per **year** are allowed.
- Status lifecycle: `DRAFT` → `ACTIVE` → `CLOSED` (no skipping, no reversing)
- Manager creates and owns the plan for their department

### 4.2 Task Types

**PROJECT task** — one-time work with a defined timeline
```
plannedStart, plannedEnd  ← required
progress tracked as completionPct 0–100%
status: PENDING → IN_PROGRESS → DONE
```

**ROUTINE task** — recurring work that repeats on a schedule
```
recurrenceType: DAILY | WEEKLY | MONTHLY
recurrenceStart, recurrenceEnd  ← validity window
tracked by "compliance" — did Officer update every expected period?
missedDates = expected periods with no TaskActual record
```

### 4.3 Task Actual
- Officer submits one record per period (daily/weekly/monthly)
- For ROUTINE: unique constraint on (planTaskId + actualDate) → 409 if duplicate
- For PROJECT: multiple records allowed, latest record = current progress
- completionPct: Decimal 0.00–100.00
- status: `DONE` | `PARTIAL` | `NOT_DONE`

### 4.4 Compliance (Routine only)
```
expectedPeriods = number of DAILY/WEEKLY/MONTHLY periods from recurrenceStart to today
completedPeriods = count of TaskActual records for this task
compliancePct = (completedPeriods / expectedPeriods) * 100
missedDates = list of periods with no record
```

---

## 5. Roles & Permissions
```
SUPER_ADMIN    → full access to everything across all companies
ADMIN_COMPANY  → full access within own companyId
MANAGER        → create/edit plans, assign plans to supervisors within own departmentId
SUPERVISOR     → create/edit tasks and assign officers within assigned plans
OFFICER        → read plans/tasks, submit TaskActual for own assigned tasks only
```

Permission matrix:

| Action                    | SUPER_ADMIN | ADMIN_COMPANY | MANAGER   | SUPERVISOR      | OFFICER       |
|---------------------------|-------------|---------------|-----------|-----------------|---------------|
| Manage companies          | ✓           |               |           |                 |               |
| Manage departments        | ✓           | own company   |           |                 |               |
| Manage users              | ✓           | own company   |           |                 |               |
| Create WorkPlan           | ✓           | own company   | own dept  |                 |               |
| Edit/Delete WorkPlan      | ✓           | own company   | own dept  |                 |               |
| Assign Plan to Supervisor | ✓           | own company   | own dept  |                 |               |
| Create PlanTask           | ✓           | own company   | own dept  | assigned plans  |               |
| Edit/Delete PlanTask      | ✓           | own company   | own dept  | assigned plans  |               |
| Assign Task to Officer    | ✓           | own company   | own dept  | assigned plans  |               |
| Submit TaskActual         | ✓           | ✓             | ✓         | ✓               | assigned only |
| View Dashboard            | all         | own company   | own dept  | assigned plans  | own tasks     |

---

## 6. Auth Flow
```
1. POST /api/auth/login → { accessToken, refreshToken }
2. Store accessToken in useState('token')
3. Store refreshToken in httpOnly cookie
4. Every API call: Authorization: Bearer <accessToken>
5. On 401 → call POST /api/auth/refresh → get new accessToken
6. On refresh fail → redirect to /login
```

JWT payload:
```ts
{ id, email, role, companyId, departmentId }
```

---

## 7. Shared Rules (apply to ALL server/api/ files)

### Always do
- Import Prisma from `~/server/utils/prisma.ts` — never create new PrismaClient
- Call `requireRole(event, ['MANAGER'])` at top of handler for protected routes
- Read user from `event.context.user` (set by server/middleware/auth.ts)
- Filter `deletedAt: null` on every Prisma query
- Scope all queries by `companyId` from `event.context.user`
- Wrap entire handler in try/catch

### Never do
- Never return `passwordHash` in any response — strip before returning
- Never hard delete — always `update({ deletedAt: new Date() })`
- Never trust role or companyId from request body — always from JWT context
- Never create PrismaClient outside `server/utils/prisma.ts`
- Never use `any` type

### Error handling
```ts
try {
  // handler logic
} catch (error: any) {
  if (error.code === 'P2002') throw createError({ statusCode: 409, message: 'Already exists' })
  if (error.code === 'P2025') throw createError({ statusCode: 404, message: 'Not found' })
  throw createError({ statusCode: 500, message: 'Internal server error' })
}
```

---

## 8. Frontend Conventions

- Use `useFetch` or `$fetch` for all API calls — never raw fetch
- Auth token lives in `useState('token')` — composable `useAuth.ts` manages it
- All forms validated with Zod schemas from `shared/schemas/`
- Role-based UI: use `useAuth().role` to show/hide UI elements
- Page-level auth guard: add `definePageMeta({ middleware: ['auth'] })`
- Role guard: `definePageMeta({ middleware: ['auth', 'role'], roles: ['MANAGER'] })`

---

## 9. Prisma Notes (SQL Server specific)

- No native enum — all status/type fields are `String @db.NVarChar(50)`
- No Json type — `oldValues`/`newValues` in AuditLog are `String` (use `JSON.stringify`)
- All relations use `onUpdate: NoAction, onDelete: NoAction`
- Soft delete column: `deletedAt DateTime?` — always filter `{ deletedAt: null }`
- UUIDs: `@id @default(uuid())`

Valid values per field (enforced in Zod, not DB):
```
role           : SUPER_ADMIN | ADMIN_COMPANY | MANAGER | SUPERVISOR | OFFICER
planStatus     : DRAFT | ACTIVE | CLOSED
taskType       : PROJECT | ROUTINE
recurrenceType : DAILY | WEEKLY | MONTHLY
taskStatus     : PENDING | IN_PROGRESS | DONE | CANCELLED
priority       : LOW | MEDIUM | HIGH | CRITICAL
updateType     : DAILY | WEEKLY | MONTHLY
actualStatus   : DONE | PARTIAL | NOT_DONE
auditAction    : CREATE | UPDATE | DELETE | LOGIN | LOGOUT
```

---

## 10. Module Build Order

Build in this sequence — each module depends on the previous:
```
1. server/utils/          → prisma, jwt, password, rbac, audit
2. server/middleware/     → auth (JWT verify)
3. server/api/auth/       → login, refresh, logout
4. server/api/companies/  → CRUD
5. server/api/departments/→ CRUD
6. server/api/users/      → CRUD
7. server/api/work-plans/ → CRUD + status transition
8. server/api/work-plans/[id]/tasks/ → PROJECT + ROUTINE
9. server/api/plan-tasks/[taskId]/actuals/ → Officer updates
10. server/api/dashboard/ → summary, compliance, progress
11. app/composables/      → useAuth, useWorkPlan, usePlanTask...
12. app/pages/            → UI screens per role
```
