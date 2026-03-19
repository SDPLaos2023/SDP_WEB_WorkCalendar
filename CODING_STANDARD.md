# Coding Standard — Work Calendar

> Stack: **Nuxt 4** · **Vue 3 (Composition API)** · **TypeScript** · **Prisma (MSSQL)** · **Zod** · **Nuxt UI v4** · **TailwindCSS v4** · **Bun**

---

## 1. ภาษาและ Encoding

| รายการ | กำหนด |
|---|---|
| ภาษาใน Code (ตัวแปร, ฟังก์ชัน, comment) | **ภาษาอังกฤษ** |
| UI / Success / Error Messages | **ภาษาลาว** (ตาม UX ที่กำหนด) |
| Encoding | **UTF-8** (กำหนดใน `.editorconfig`) |
| Line Ending | **LF** (Unix-style) |

---

## 2. การตั้งชื่อ (Naming Conventions)

### 2.1 ทั่วไป (TypeScript / JavaScript)

| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| ตัวแปร / parameter | `camelCase` | `pageSize`, `searchQuery` |
| ฟังก์ชัน | `camelCase` | `getUsers()`, `hashPassword()` |
| Class | `PascalCase` | `UserService`, `BaseRepository` |
| Interface / Type | `PascalCase` | `ApiResponse`, `PaginationOptions` |
| Enum | `PascalCase` (key ใช้ `UPPER_SNAKE_CASE`) | `Role.ADMIN`, `Status.ACTIVE` |
| Constant (global) | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `DEFAULT_ROLE` |
| Private field (Class) | `camelCase` (ไม่ต้องใส่ `_`) | `this.model`, `this.db` |
| Zod Schema | `PascalCase` + suffix `Schema` | `UserSchema`, `CustomerUpdateSchema` |

### 2.2 Vue / Nuxt

| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| Component file | `PascalCase.vue` | `UserFormModal.vue`, `ConfirmModal.vue` |
| Page file | `kebab-case.vue` | `index.vue`, `[id].vue` |
| Composable | `use` + `PascalCase` | `useApiAction.ts`, `useUsers.ts` |
| Layout file | `kebab-case.vue` | `default.vue`, `auth.vue` |
| Middleware file | `kebab-case.ts` | `auth.ts` |

### 2.3 Server / API

| สิ่ง | รูปแบบ | ตัวอย่าง |
|---|---|---|
| API route file | `[method].ts` หรือ `[param].[method].ts` | `index.get.ts`, `[id].patch.ts` |
| Service file | `[entity].service.ts` | `user.service.ts` |
| Service class | `PascalCase` + `Service` | `UserService` |
| Repository | `[entity]Repository` (camelCase) | `userRepository`, `customerRepository` |
| Util file | `kebab-case.ts` | `api-response.ts`, `base-repository.ts` |

### 2.4 Database (Prisma)

| สิ่ง | รูปแบบ |
|---|---|
| Model | `PascalCase` (singular) เช่น `User`, `Customer` |
| Field | `camelCase` เช่น `createdAt`, `firstName` |
| Enum | `PascalCase` เช่น `Role`, `Status` |

---

## 3. โครงสร้างไฟล์ (File Structure)

```
Work_Calendar/
├── app/                        # Frontend (Nuxt App Dir)
│   ├── components/
│   │   ├── [EntityName]/       # Component group ตาม entity
│   │   │   └── EntityFormModal.vue
│   │   └── Shared.vue          # Global components ชื่อ PascalCase ตรงๆ
│   ├── composables/            # useXxx.ts
│   ├── layouts/                # default.vue, auth.vue
│   ├── middleware/             # auth.ts
│   ├── pages/                  # ตาม Nuxt file-based routing
│   ├── types/                  # Frontend types
│   └── utils/                  # Frontend utilities
│
├── server/
│   ├── api/
│   │   └── [entity]/           # API group ตาม entity
│   │       ├── index.get.ts
│   │       ├── index.post.ts
│   │       ├── [id].patch.ts
│   │       └── [id].delete.ts
│   ├── middleware/             # Server middleware
│   ├── services/               # [entity].service.ts
│   └── utils/                  # Shared server utilities (auto-imported)
│
├── prisma/                     # Schema + migrations
├── tests/                      # Vitest test files
├── types/                      # Shared types (frontend + server)
└── public/                     # Static assets
```

---

## 4. TypeScript

### 4.1 กฎทั่วไป

- **ห้ามใช้ `any`** ยกเว้นกรณีจำเป็น (Prisma `where` clause) → ต้องมี comment อธิบาย
- ใช้ **`interface`** สำหรับ object shape ที่อาจถูก extend
- ใช้ **`type`** สำหรับ union types, mapped types, หรือ utility types
- ใช้ **`readonly`** สำหรับ property ที่ไม่ควรเปลี่ยน
- เสมอ define **return type** ของฟังก์ชัน public/exported
- ใช้ **Generic** แทน `any` เมื่อทำได้

```typescript
// ✅ ถูกต้อง
async function getUsers(params: GetUsersParams): Promise<PaginatedResult<User>> { ... }

// ❌ ผิด
async function getUsers(params: any) { ... }
```

### 4.2 Type vs Interface

```typescript
// Interface: สำหรับ object shape
interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// Type: สำหรับ union / utility
type UserRole = 'ADMIN' | 'EDITOR' | 'USER'
type CreateUserData = Omit<User, 'id' | 'createdAt'>
```

### 4.3 Zod Schemas (Validation)

- ทุก schema อยู่ใน `server/utils/validation.ts`
- ชื่อ: `[Entity]Schema` และ `[Entity]UpdateSchema`
- ใช้ `.partial()` สำหรับ Update schema เสมอ
- ดึง type ด้วย `z.infer<typeof Schema>`

```typescript
export const UserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'EDITOR', 'USER']).default('USER'),
})

export const UserUpdateSchema = UserSchema.partial()
export type CreateUserInput = z.infer<typeof UserSchema>
export type UpdateUserInput = z.infer<typeof UserUpdateSchema>
```

---

## 5. Vue Component

### 5.1 โครงสร้าง Component

เรียงลำดับ block ดังนี้ (Script ก่อน Template เสมอ):

```vue
<script setup lang="ts">
// 1. Imports
// 2. Props & Emits
// 3. Injected composables / stores
// 4. Reactive state
// 5. Computed
// 6. Functions
// 7. Lifecycle hooks & Watchers
</script>

<template>
  <!-- เนื้อหา -->
</template>
```

### 5.2 Props & Emits

```typescript
// ✅ ใช้ TypeScript Generic form เสมอ
const props = defineProps<{
  user?: User
  loading?: boolean
}>()

// ✅ ใช้ withDefaults เมื่อมี default value
const props = withDefaults(defineProps<{
  pageSize?: number
}>(), {
  pageSize: 10
})

const emit = defineEmits<{
  success: []
  close: []
  'update:modelValue': [value: boolean]
}>()
```

### 5.3 Composable Pattern

```typescript
// ✅ ทุก composable ต้อง return object (ไม่ใช่ array)
export function useUsers() {
  const users = ref<User[]>([])
  const loading = ref(false)

  async function fetchUsers() { ... }

  return { users, loading, fetchUsers }
}
```

### 5.4 Template Guidelines

- ใช้ **`v-if` / `v-else-if` / `v-else`** แยก logic ชัดเจน
- ห้ามใช้ `v-if` และ `v-for` บน element เดียวกัน (ใช้ `<template>` แทน)
- `key` attribute จำเป็นเสมอใน `v-for`
- ใช้ shorthand: `:prop` แทน `v-bind:prop`, `@event` แทน `v-on:event`

```vue
<!-- ✅ ถูกต้อง -->
<template v-for="user in users" :key="user.id">
  <UserCard v-if="user.isActive" :user="user" />
</template>

<!-- ❌ ผิด -->
<UserCard v-for="user in users" v-if="user.isActive" :key="user.id" />
```

---

## 6. Server / API Layer

### 6.1 Architecture Pattern

```
Request → API Handler (server/api/) → Service (server/services/) → Repository (server/utils/repositories.ts) → Prisma
```

- **API Handler**: รับ request, validate, delegate ไป Service → ไม่ควรมี business logic
- **Service**: Business logic (hashing, checks, transformations)
- **Repository**: Database queries เท่านั้น
- **Utils**: Helper functions ที่ใช้ร่วมกัน (auto-imported by Nuxt)

### 6.2 API Handler Template

```typescript
// server/api/[entity]/index.get.ts
import { entityService } from '../../services/entity.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)                    // Auth check ก่อน
  const query = getQuery(event)

  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 10

  const result = await entityService.getEntities({ page, pageSize })
  return sendSuccess(result)
})
```

### 6.3 Error Handling

- ใช้ **`sendApiError(message, statusCode)`** เสมอ (ไม่ throw Error โดยตรง)
- HTTP Status codes มาตรฐาน:

| Status | ใช้เมื่อ |
|---|---|
| `200` | Success (default) |
| `201` | Created |
| `400` | Bad Request (validation failed) |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `409` | Conflict (duplicate data) |
| `422` | Unprocessable Entity (Zod error) |
| `500` | Server Error |

```typescript
// ✅ ถูกต้อง
const existing = await userRepository.findByEmail(data.email)
if (existing) {
  return sendApiError('Email already exists', 409)
}

// ❌ ผิด
if (existing) {
  throw new Error('Email already exists')
}
```

### 6.4 Service Layer

```typescript
export class UserService {
  // ✅ ใช้ typed parameter แทน any
  async createUser(data: CreateUserInput): Promise<User> {
    if (data.password) {
      data.password = await hashPassword(data.password)
    }
    return userRepository.create(data)
  }
}

// ✅ Export singleton instance เสมอ
export const userService = new UserService()
```

---

## 7. การจัดการ Imports

- ใน **server/**: Nuxt auto-import utils จาก `server/utils/` ไม่ต้อง import ซ้ำ
- ใน **app/**: composables, components, utils ถูก auto-import
- เรียงลำดับ import:
  1. Node.js built-in
  2. External packages (vue, nuxt, zod, ...)
  3. Internal aliases (`~/`, `@/`, `../../`)
  4. Types (ใช้ `import type`)

```typescript
// ✅ ตัวอย่างที่ถูกต้อง
import { z } from 'zod'
import type { H3Event } from 'h3'
import { userRepository } from '../utils/repositories'
import type { CreateUserInput } from '~/types/user'
```

---

## 8. Formatting & Style

กำหนดผ่าน **ESLint + EditorConfig** (enforce อัตโนมัติ):

| กฎ | ค่า |
|---|---|
| Indentation | 2 spaces |
| Quote | Single quote (`'`) |
| Semicolon | ไม่ใส่ (ASI) |
| Trailing comma | ES5 |
| Max attributes per line (Vue) | 3 (single-line), 1 (multi-line) |
| Line ending | LF |

```typescript
// ✅ ถูกต้อง
const result = await userService.getUsers({
  page,
  pageSize,
  search,
})

// ❌ ผิด (semicolons, double quotes)
const result = await userService.getUsers({"page": page, "pageSize": pageSize});
```

---

## 9. Testing (Vitest)

### 9.1 โครงสร้าง Test

```
tests/
├── unit/          # Unit tests สำหรับ utils, services
└── e2e/           # Integration tests ด้วย @nuxt/test-utils
```

### 9.2 Test File Naming

- Unit test: `[filename].test.ts` หรือ `[filename].spec.ts`
- ตำแหน่ง: `tests/` (ไม่วางไว้ใน `server/` หรือ `app/`)

### 9.3 Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('UserService', () => {
  describe('createUser', () => {
    it('should hash password before saving', async () => {
      // Arrange
      const input = { username: 'john', password: 'secret123' }

      // Act
      const result = await userService.createUser(input)

      // Assert
      expect(result.password).not.toBe('secret123')
      expect(result.password).toMatch(/^\$2/)
    })
  })
})
```

### 9.4 กฎทั่วไป

- ใช้ `describe` จัดกลุ่มตาม class/function
- ชื่อ test ขึ้นต้นด้วย `should ...`
- ทุก test ต้องมี **Arrange / Act / Assert** (แยก section ด้วย blank line)
- Mock external dependencies (prisma, email service) ทุกครั้ง

---

## 10. Git Conventions

### 10.1 Branch Naming

```
feature/[short-description]    # feature ใหม่
fix/[short-description]        # bug fix
chore/[short-description]      # งาน maintenance
refactor/[short-description]   # refactoring ไม่เปลี่ยน behavior
```

### 10.2 Commit Message (Conventional Commits)

```
<type>(<scope>): <subject>
```

| Type | ใช้เมื่อ |
|---|---|
| `feat` | เพิ่ม feature ใหม่ |
| `fix` | แก้ bug |
| `chore` | งาน setup, config, deps |
| `refactor` | refactor โดยไม่เปลี่ยน behavior |
| `docs` | แก้ documentation |
| `test` | เพิ่ม/แก้ tests |
| `style` | แก้ formatting (ไม่เปลี่ยน logic) |

```bash
# ✅ ตัวอย่างที่ถูกต้อง
feat(users): add server-side pagination for user list
fix(auth): handle expired session redirect correctly
chore(deps): upgrade nuxt to v4.3.1
test(users): add unit tests for UserService.createUser
```

---

## 11. Security

- **ห้าม** commit `.env` ไฟล์จริง (ใช้ `.env.example` เป็น template)
- **ทุก API route** ต้องมี auth check (`requireAdmin` / `requireUserSession`) บรรทัดแรก
- **ห้าม return** sensitive fields (password, token) ใน API response
  ```typescript
  // ✅ ใช้ select ตัด sensitive fields
  return await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true }
  })
  ```
- Password ต้องถูก **encrypt ฝั่ง client** (CryptoJS) และ **hash ฝั่ง server** (bcrypt) ก่อน store
- ใช้ **Zod validation** ทุก request ที่รับ user input

---

## 12. Performance Guidelines

- ใช้ **server-side pagination** สำหรับทุก list endpoint (ห้าม fetch all)
- ใช้ `select` ใน Prisma เพื่อดึงเฉพาะ fields ที่ต้องการ
- ใช้ `useLazyFetch` / `useFetch` สำหรับ data fetching ใน Vue (ไม่ใช้ `$fetch` โดยตรงใน setup)
- Cache ค่าที่ compute บ่อยด้วย `computed()` แทน method

---

## 13. เครื่องมือและ Scripts

| คำสั่ง | ใช้เพื่อ |
|---|---|
| `bun run dev` | Start dev server |
| `bun run lint` | Run ESLint check |
| `bun run typecheck` | TypeScript type check |
| `bun run test` | Run all tests |
| `bun run test:ui` | Run tests with UI |
| `bun run build` | Production build |
| `bunx prisma studio` | เปิด Prisma Studio |
| `bunx prisma db push` | Sync schema ไป database |

> **ก่อน push**: ต้องผ่านทั้ง `lint` และ `typecheck` โดยไม่มี error

---

## 14. Code Review Checklist

ก่อน merge ทุก PR ให้ตรวจสอบ:

- [ ] ไม่มี `any` type ที่ไม่จำเป็น
- [ ] ทุก API route มี authentication check
- [ ] Sensitive fields ไม่ถูก return ใน response
- [ ] Input ถูก validate ด้วย Zod ก่อน process
- [ ] Error ใช้ `sendApiError` ไม่ใช่ `throw new Error`
- [ ] ชื่อตัวแปร/ฟังก์ชันสื่อความหมาย
- [ ] ไม่มี `console.log` เหลือค้างใน production code
- [ ] Test ผ่านทั้งหมด (`bun run test`)
- [ ] ESLint ไม่มี error (`bun run lint`)
- [ ] TypeScript ไม่มี error (`bun run typecheck`)
