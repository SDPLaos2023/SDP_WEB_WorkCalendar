<script setup lang="ts">
const { t } = useI18n()
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { RowSelectionState } from '@tanstack/table-core'

definePageMeta({
  middleware: 'auth',
  roles: ['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER']
})

const { apiFetch, user: sessionUser } = useAuth()
const UBadge = resolveComponent('UBadge')
const UCheckbox = resolveComponent('UCheckbox')

const columns = computed<TableColumn<any>[]>(() => [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      modelValue: table.getIsSomePageRowsSelected()
        ? 'indeterminate'
        : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: any) => table.toggleAllPageRowsSelected(!!value),
      ariaLabel: 'Select all'
    }),
    cell: ({ row }) => h(UCheckbox, {
      modelValue: row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
      ariaLabel: 'Select row'
    })
  },
  { accessorKey: 'firstName', header: t('common.name') },
  { accessorKey: 'lastName', header: t('common.name') + ' (Last)' },
  { accessorKey: 'username', header: 'Username' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'company.name', header: t('management.company') },
  { accessorKey: 'department.name', header: t('management.department') },
  {
    accessorKey: 'role',
    header: t('management.role'),
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return h(UBadge, { label: role, variant: 'subtle', size: 'sm', color: role === 'SUPER_ADMIN' ? 'error' : role === 'ADMIN_COMPANY' ? 'primary' : 'neutral' })
    }
  },
  {
    accessorKey: 'isActive',
    header: t('common.status'),
    cell: ({ row }) => {
      const active = row.getValue('isActive') as boolean
      const activeLabel = t('plans.status_active')
      const inactiveLabel = 'Inactive'
      return h(UBadge, { label: active ? activeLabel : inactiveLabel, color: active ? 'success' : 'error', variant: 'subtle' })
    }
  },
  { id: 'actions', header: '' }
])

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const roleFilter = ref('all')
const totalUsers = ref(0)
const users = ref<any[]>([])
const pending = ref(false)
const rowSelection = ref<RowSelectionState>({})

const table = useTemplateRef<any>('table')
const selection = computed(() => {
  if (!table.value?.tableApi) return []
  return table.value.tableApi.getFilteredSelectedRowModel().rows.map((r: any) => r.original)
})

const isModalOpen = ref(false)
const editingUser = ref<any>(null)
const isConfirmOpen = ref(false)
const confirmTarget = ref<any>(null)
const deleting = ref(false)
const isBulkDelete = ref(false)

async function fetchUsers() {
  pending.value = true
  rowSelection.value = {} // Clear selection on fetch
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: pageSize.value.toString(),
      search: search.value
    })

    if (roleFilter.value && roleFilter.value !== 'all') {
      params.append('role', roleFilter.value)
    }

    const res = await apiFetch<any>(`/api/users?${params.toString()}`)
    if (res.success) {
      users.value = res.data
      totalUsers.value = res.meta?.total || res.total || res.data.length
    }
  } catch (err: any) {
    useToast().add({ title: 'Error loading users', color: 'error' })
  } finally {
    pending.value = false
  }
}

watch([page, pageSize, search, roleFilter], () => {
  fetchUsers()
}, { immediate: true })

function openCreate() {
  editingUser.value = null
  isModalOpen.value = true
}

function openEdit(user: any) {
  editingUser.value = user
  isModalOpen.value = true
}

function startDelete(user: any) {
  isBulkDelete.value = false
  confirmTarget.value = user
  isConfirmOpen.value = true
}

function startBulkDelete() {
  if (selection.value.length === 0) return
  isBulkDelete.value = true
  isConfirmOpen.value = true
}

async function onConfirmDelete() {
  deleting.value = true
  try {
    if (isBulkDelete.value) {
      const ids = selection.value.map((s: any) => s.id)
      await apiFetch('/api/users/bulk-delete', {
        method: 'POST',
        body: { ids }
      })
      useToast().add({ title: `Deleted ${ids.length} users`, color: 'success' })
      rowSelection.value = {}
    } else {
      if (!confirmTarget.value) return
      await apiFetch(`/api/users/${confirmTarget.value.id}`, { method: 'DELETE' })
      useToast().add({ title: 'User deleted', color: 'success' })
    }
    isConfirmOpen.value = false
    fetchUsers()
  } catch (err: any) {
    useToast().add({ title: 'Error', description: err.data?.statusMessage || 'Operation failed', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function getRowItems(user: any) {
  // Prevent deleting oneself
  const actions = [
    { label: t('common.edit'), icon: 'i-heroicons-pencil-square', onSelect: () => openEdit(user) }
  ]
  if (user.id !== sessionUser.value?.id) {
    actions.push({ label: t('common.delete'), icon: 'i-heroicons-trash', onSelect: () => startDelete(user) })
  }
  return [actions]
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold font-heading">{{ t('management.users') }}</h1>
        <p class="text-gray-500">{{ t('management.users_subtitle') }}</p>
      </div>
    </div>

    <UCard>
      <div class="flex items-center justify-between mb-4 gap-4">
        <div class="flex gap-4 flex-1">
          <UInput v-model="search" icon="i-heroicons-magnifying-glass" :placeholder="t('common.search')" class="w-64" />
          <USelect
            v-model="roleFilter"
            :items="[
              { label: t('common.all'), value: 'all' },
              { label: 'Super Admin', value: 'SUPER_ADMIN' },
              { label: 'Company Admin', value: 'ADMIN_COMPANY' },
              { label: 'Manager', value: 'MANAGER' },
              { label: 'Supervisor', value: 'SUPERVISOR' },
              { label: 'Officer', value: 'OFFICER' }
            ]"
            class="w-48"
          />
        </div>

        <div class="flex gap-2">
          <UButton v-if="selection.length > 0" :label="t('common.delete')" icon="i-heroicons-trash" color="error" variant="soft" @click="startBulkDelete" />
          <UButton :label="t('common.create')" icon="i-heroicons-plus" @click="openCreate" />
        </div>
      </div>

      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        :data="users"
        :columns="columns"
        :loading="pending"
      >
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UDropdownMenu :items="getRowItems(row.original)" :content="{ align: 'end' }">
              <UButton icon="i-heroicons-ellipsis-vertical" color="neutral" variant="ghost" />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>

      <div class="flex items-center justify-between mt-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">{{ t('common.all') }}: {{ totalUsers }}</span>
          <span v-if="selection.length > 0" class="text-sm text-primary-500 font-medium">({{ selection.length }})</span>
        </div>
        <UPagination v-model:page="page" :total="totalUsers" :items-per-page="pageSize" />
      </div>
    </UCard>

    <UsersUserFormModal v-model:open="isModalOpen" :user="editingUser" @success="fetchUsers" @close="isModalOpen = false" />

    <ConfirmModal
      v-model:open="isConfirmOpen"
      :title="t('common.delete')"
      :description="isBulkDelete
        ? t('plans.confirm_delete')
        : t('plans.confirm_delete')"
      :loading="deleting"
      @confirm="onConfirmDelete"
      @close="isConfirmOpen = false"
    />
  </div>
</template>
