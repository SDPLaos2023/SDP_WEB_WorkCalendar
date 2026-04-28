<script setup lang="ts">
const { t } = useI18n()
import type { TableColumn } from '@nuxt/ui'
import type { RowSelectionState } from '@tanstack/table-core'

definePageMeta({
  middleware: 'auth',
  roles: ['SUPER_ADMIN', 'ADMIN_COMPANY']
})

const { apiFetch, role } = useAuth()
const UCheckbox = resolveComponent('UCheckbox')

const columns = computed(() => {
  const cols: TableColumn<any>[] = [
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
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: t('common.name') }
  ]

  if (role.value === 'SUPER_ADMIN') {
    cols.push({
      accessorKey: 'company.name',
      header: t('management.company'),
      cell: ({ row }) => row.original.company?.name || '-'
    })
  }

  cols.push({ accessorKey: 'createdAt', header: t('common.date'), cell: ({ row }) => formatDate(row.getValue('createdAt')) })
  cols.push({ id: 'actions', header: '' })

  return cols
})

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const selectedCompanyId = ref('all')
const companies = ref<any[]>([])
const loadingCompanies = ref(false)

const totalDepartments = ref(0)
const departments = ref<any[]>([])
const pending = ref(false)
const rowSelection = ref<RowSelectionState>({})

const table = useTemplateRef<any>('table')
const selection = computed(() => {
  if (!table.value?.tableApi) return []
  return table.value.tableApi.getFilteredSelectedRowModel().rows.map((r: any) => r.original)
})

const isModalOpen = ref(false)
const editingDepartment = ref<any>(null)
const isConfirmOpen = ref(false)
const confirmTarget = ref<any>(null)
const deleting = ref(false)
const isBulkDelete = ref(false)

async function fetchCompanies() {
  if (role.value !== 'SUPER_ADMIN') return
  loadingCompanies.value = true
  try {
    const res = await apiFetch<any>('/api/companies?limit=100')
    if (res.success) {
      companies.value = [{ id: 'all', name: t('common.all') }, ...res.data]
    }
  } catch (err) {
    console.error('Failed to fetch companies', err)
  } finally {
    loadingCompanies.value = false
  }
}

async function fetchDepartments() {
  pending.value = true
  rowSelection.value = {}
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: pageSize.value.toString(),
      search: search.value
    })

    if (selectedCompanyId.value && selectedCompanyId.value !== 'all') {
      params.append('companyId', selectedCompanyId.value)
    }

    const res = await apiFetch<any>(`/api/departments?${params.toString()}`)
    if (res.success) {
      departments.value = res.data
      totalDepartments.value = res.meta?.total || res.total || res.data.length
    }
  } catch (err: any) {
    useToast().add({ title: 'Error loading departments', color: 'error' })
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  fetchCompanies()
})

watch([page, pageSize, search, selectedCompanyId], () => {
  fetchDepartments()
}, { immediate: true })

function openCreate() {
  editingDepartment.value = null
  isModalOpen.value = true
}

function openEdit(dept: any) {
  editingDepartment.value = dept
  isModalOpen.value = true
}

function startDelete(dept: any) {
  isBulkDelete.value = false
  confirmTarget.value = dept
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
      await apiFetch('/api/departments/bulk-delete', {
        method: 'POST',
        body: { ids }
      })
      useToast().add({ title: `Deleted ${ids.length} departments`, color: 'success' })
      rowSelection.value = {}
    } else {
      if (!confirmTarget.value) return
      await apiFetch(`/api/departments/${confirmTarget.value.id}`, { method: 'DELETE' })
      useToast().add({ title: 'Department deleted', color: 'success' })
    }
    isConfirmOpen.value = false
    fetchDepartments()
  } catch (err: any) {
    useToast().add({ title: 'Error', description: err.data?.statusMessage || 'Operation failed', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function getRowItems(dept: any) {
  return [[
    { label: t('common.edit'), icon: 'i-heroicons-pencil-square', onSelect: () => openEdit(dept) },
    { label: t('common.delete'), icon: 'i-heroicons-trash', onSelect: () => startDelete(dept) }
  ]]
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold font-heading">{{ t('management.department') }}</h1>
        <p class="text-gray-500">{{ t('management.departments_subtitle') }}</p>
      </div>
    </div>

    <UCard>
      <div class="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
        <div class="flex flex-col md:flex-row gap-4 flex-1 w-full md:w-auto">
          <UInput v-model="search" icon="i-heroicons-magnifying-glass" :placeholder="t('common.search')" class="w-full md:w-64" />

          <USelect
            v-if="role === 'SUPER_ADMIN'"
            v-model="selectedCompanyId"
            :items="companies"
            label-key="name"
            value-key="id"
            placeholder="All Companies"
            class="w-full md:w-64"
          />
        </div>

        <div class="flex gap-2 w-full md:w-auto justify-end">
          <UButton v-if="selection.length > 0" :label="t('common.delete')" icon="i-heroicons-trash" color="error" variant="soft" @click="startBulkDelete" />
          <UButton :label="t('common.create')" icon="i-heroicons-plus" @click="openCreate" />
        </div>
      </div>

      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        :data="departments"
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
          <span class="text-sm text-gray-500">{{ t('common.all') }}: {{ totalDepartments }}</span>
          <span v-if="selection.length > 0" class="text-sm text-primary-500 font-medium">({{ selection.length }})</span>
        </div>
        <UPagination v-model:page="page" :total="totalDepartments" :items-per-page="pageSize" />
      </div>
    </UCard>

    <DepartmentsDepartmentFormModal v-model:open="isModalOpen" :department="editingDepartment" @success="fetchDepartments" @close="isModalOpen = false" />

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
