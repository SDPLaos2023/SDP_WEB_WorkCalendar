<script setup lang="ts">
const { t } = useI18n()
import type { TableColumn } from '@nuxt/ui'
import type { RowSelectionState } from '@tanstack/table-core'

definePageMeta({
  middleware: 'auth',
  roles: ['SUPER_ADMIN']
})

const { apiFetch } = useAuth()
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
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'createdAt', header: t('common.date'), cell: ({ row }) => formatDate(row.getValue('createdAt')) },
  { id: 'actions', header: '' }
])

const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const totalCompanies = ref(0)
const companies = ref<any[]>([])
const pending = ref(false)
const rowSelection = ref<RowSelectionState>({})

const table = useTemplateRef<any>('table')
const selection = computed(() => {
  if (!table.value?.tableApi) return []
  return table.value.tableApi.getFilteredSelectedRowModel().rows.map((r: any) => r.original)
})

const isModalOpen = ref(false)
const editingCompany = ref<any>(null)
const isConfirmOpen = ref(false)
const confirmTarget = ref<any>(null)
const deleting = ref(false)
const isBulkDelete = ref(false)

async function fetchCompanies() {
  pending.value = true
  rowSelection.value = {}
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: pageSize.value.toString(),
      search: search.value
    })

    const res = await apiFetch<any>(`/api/companies?${params.toString()}`)
    if (res.success) {
      companies.value = res.data
      totalCompanies.value = res.meta?.total || res.total || res.data.length
    }
  } catch (err: any) {
    useToast().add({ title: 'Error loading companies', color: 'error' })
  } finally {
    pending.value = false
  }
}

watch([page, pageSize, search], () => {
  fetchCompanies()
}, { immediate: true })

function openCreate() {
  editingCompany.value = null
  isModalOpen.value = true
}

function openEdit(company: any) {
  editingCompany.value = company
  isModalOpen.value = true
}

function startDelete(company: any) {
  isBulkDelete.value = false
  confirmTarget.value = company
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
      await apiFetch('/api/companies/bulk-delete', {
        method: 'POST',
        body: { ids }
      })
      useToast().add({ title: `Deleted ${ids.length} companies`, color: 'success' })
      rowSelection.value = {}
    } else {
      if (!confirmTarget.value) return
      await apiFetch(`/api/companies/${confirmTarget.value.id}`, { method: 'DELETE' })
      useToast().add({ title: 'Company deleted', color: 'success' })
    }
    isConfirmOpen.value = false
    fetchCompanies()
  } catch (err: any) {
    useToast().add({ title: 'Error', description: err.data?.statusMessage || 'Operation failed', color: 'error' })
  } finally {
    deleting.value = false
  }
}

function getRowItems(company: any) {
  return [[
    { label: t('common.edit'), icon: 'i-heroicons-pencil-square', onSelect: () => openEdit(company) },
    { label: t('common.delete'), icon: 'i-heroicons-trash', onSelect: () => startDelete(company) }
  ]]
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold font-heading">{{ t('management.company') }}</h1>
        <p class="text-gray-500">{{ t('management.companies_subtitle') }}</p>
      </div>
    </div>

    <UCard>
      <div class="flex items-center justify-between mb-4 gap-4">
        <div class="flex gap-4 flex-1">
          <UInput v-model="search" icon="i-heroicons-magnifying-glass" :placeholder="t('common.search')" class="w-64" />
        </div>

        <div class="flex gap-2">
          <UButton v-if="selection.length > 0" :label="t('common.delete')" icon="i-heroicons-trash" color="error" variant="soft" @click="startBulkDelete" />
          <UButton :label="t('common.create')" icon="i-heroicons-plus" @click="openCreate" />
        </div>
      </div>

      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        :data="companies"
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
          <span class="text-sm text-gray-500">{{ t('common.all') }}: {{ totalCompanies }}</span>
          <span v-if="selection.length > 0" class="text-sm text-primary-500 font-medium">({{ selection.length }})</span>
        </div>
        <UPagination v-model:page="page" :total="totalCompanies" :items-per-page="pageSize" />
      </div>
    </UCard>

    <CompaniesCompanyFormModal v-model:open="isModalOpen" :company="editingCompany" @success="fetchCompanies" @close="isModalOpen = false" />

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
