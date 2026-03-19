<script setup lang="ts">
import type { RowSelectionState } from '@tanstack/table-core'

definePageMeta({
  layout: 'default'
})

const { user } = useUserSession()
const isAdmin = computed(() => (user.value as any)?.role === 'ADMIN')
const isEditor = computed(() => ['ADMIN', 'EDITOR'].includes((user.value as any)?.role))

const UCheckbox = resolveComponent('UCheckbox')

const columns = computed(() => {
  const cols = [
    {
      accessorKey: 'id',
      header: 'ID'
    }, 
    {
      accessorKey: 'name',
      header: 'Name'
    }, 
    {
      accessorKey: 'email',
      header: 'Email'
    }, 
    {
      accessorKey: 'location',
      header: 'Location'
    },
    {
      accessorKey: 'status',
      header: 'Status'
    }, 
    {
      id: 'actions',
      header: ''
    }
  ]

  if (isEditor.value) {
    cols.unshift({
      id: 'select',
      header: ({ table }: any) =>
        h(UCheckbox as any, {
          'modelValue': table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          'ariaLabel': 'Select all'
        }),
      cell: ({ row }: any) =>
        h(UCheckbox as any, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'ariaLabel': 'Select row'
        })
    } as any)
  }

  return cols
})

// API & Global State
const page = ref(1)
const pageSize = ref(10)
const search = ref('')
const statusFilter = ref('all')
const columnVisibility = ref({})

// Reset page when pageSize or statusFilter changes
watch([pageSize, statusFilter], () => {
  page.value = 1
})

const isModalOpen = ref(false)
const editingCustomer = ref<any>(null)
const rowSelection = ref<RowSelectionState>({})

const { data: customers, refresh, pending } = useApi<any>(() => {
  const params = new URLSearchParams({
    page: page.value.toString(),
    pageSize: pageSize.value.toString(),
    search: search.value
  })
  if (statusFilter.value && statusFilter.value !== 'all') params.append('status', statusFilter.value)
  
  return `/api/customers?${params.toString()}`
})

const { execute: deleteCustomer, loading: deleting } = useApiAction()

// Table API
const table = useTemplateRef<any>('table')
const selectedRows = computed(() => table.value?.tableApi?.getFilteredSelectedRowModel().rows || [])

const isConfirmOpen = ref(false)
const confirmTarget = ref<{ id?: any, type: 'single' | 'bulk' } | null>(null)

// Modal Actions
function openCreate() {
  editingCustomer.value = null
  isModalOpen.value = true
}

function openEdit(customer: any) {
  editingCustomer.value = customer
  isModalOpen.value = true
}

function onModalSuccess() {
  isModalOpen.value = false
  refresh()
}

function getRowItems(customer: any) {
  return [
    [{
      label: 'Edit',
      icon: 'i-lucide-pencil',
      onSelect: () => openEdit(customer)
    }, {
      label: 'Delete',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => startDelete(customer.id),
      disabled: !isAdmin.value
    }]
  ]
}

// Bulk Actions
function startDelete(id: any) {
  if (!isAdmin.value) return
  confirmTarget.value = { id, type: 'single' }
  isConfirmOpen.value = true
}

function startBulkDelete() {
  if (!isAdmin.value) return
  confirmTarget.value = { type: 'bulk' }
  isConfirmOpen.value = true
}

async function onConfirmDelete() {
  if (!confirmTarget.value) return

  if (confirmTarget.value.type === 'single') {
    const { error } = await deleteCustomer(
      () => $fetch(`/api/customers/${confirmTarget.value?.id}`, { method: 'DELETE' }) as any,
      { successMessage: 'ລົບຂໍ້ມູນສຳເລັດ' }
    )
    if (!error) refresh()
  } else {
    const count = selectedRows.value.length
    for (const row of selectedRows.value) {
      await $fetch(`/api/customers/${row.original.id}`, { method: 'DELETE' })
    }
    useToast().add({ title: 'ສຳເລັດ', description: `ລົບຂໍ້ມູນ ${count} ລายการแล้ว`, color: 'success' })
    rowSelection.value = {}
    refresh()
  }
  isConfirmOpen.value = false
}
</script>

<template>
  <UDashboardPanel id="customers" grow>
    <template #header>
      <UDashboardNavbar title="Customer Management">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        
        <template #right>
          <UButton v-if="isEditor" label="Add Customer" icon="i-lucide-plus" @click="openCreate" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-1.5">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search customers..."
              class="w-64"
            />
            
            <USelect
              v-model="statusFilter"
              :items="[
                { label: 'All Status', value: 'all' },
                { label: 'Subscribed', value: 'subscribed' },
                { label: 'Unsubscribed', value: 'unsubscribed' },
                { label: 'Bounced', value: 'bounced' }
              ]"
              class="w-32"
            />

            <USelect
              v-model="pageSize"
              :items="[5, 10, 20, 50, 100]"
              class="w-20"
            />

            <UDropdownMenu
              :items="
                table?.tableApi
                  ?.getAllColumns()
                  .filter((column: any) => column.getCanHide())
                  .map((column: any) => ({
                    label: column.id,
                    type: 'checkbox' as const,
                    checked: column.getIsVisible(),
                    onUpdateChecked(checked: boolean) {
                      table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                    },
                    onSelect(e?: Event) {
                      e?.preventDefault()
                    }
                  }))
              "
              :content="{ align: 'end' }"
            >
              <UButton
                label="Display"
                color="neutral"
                variant="outline"
                trailing-icon="i-lucide-settings-2"
              />
            </UDropdownMenu>
          </div>
        </template>

        <template #right>
          <UButton
            v-if="isAdmin && selectedRows.length > 0"
            label="Delete Selected"
            color="error"
            variant="subtle"
            icon="i-lucide-trash"
            @click="startBulkDelete"
          >
            <template #trailing>
              <UKbd>{{ selectedRows.length }}</UKbd>
            </template>
          </UButton>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Modals -->
      <CustomersCustomerFormModal v-model:open="isModalOpen" :customer="editingCustomer" @success="onModalSuccess" @close="isModalOpen = false" />
      <ConfirmModal
        v-model:open="isConfirmOpen"
        :title="confirmTarget?.type === 'bulk' ? 'ลบข้อมูลที่เลือก' : 'ลบข้อมูลลูกค้า'"
        :description="confirmTarget?.type === 'bulk' ? `คุณแน่ใจหรือไม่ที่จะลบข้อมูลที่เลือกทั้งหมด ${selectedRows.length} รายการ?` : 'คุณแน่ใจหรือไม่ที่จะลบข้อมูลลูกค้านี้?'"
        :loading="deleting"
        @confirm="onConfirmDelete"
        @close="isConfirmOpen = false"
      />

      <!-- Main Content -->
      <UDashboardPanelContent scrollable class="p-0">
        <UTable
          ref="table"
          v-model:row-selection="rowSelection"
          v-model:column-visibility="columnVisibility"
          :data="customers?.data?.data || []"
          :columns="columns"
          :loading="pending"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
            separator: 'h-0'
          }"
        >
          <!-- Custom Cell Templates -->
          <template #name-cell="{ row }">
            <div class="flex items-center gap-3 text-sm">
              <UAvatar :src="(row.original.avatar as string | undefined)" :alt="(row.original.name as string)" size="sm" />
              <div class="flex flex-col">
                <span class="font-medium text-highlighted">{{ row.original.name }}</span>
              </div>
            </div>
          </template>

          <template #status-cell="{ row }">
            <UBadge 
              :color="
                row.original.status === 'subscribed' ? 'success' : 
                row.original.status === 'unsubscribed' ? 'error' : 'warning'
              " 
              variant="subtle" 
              size="sm"
              class="capitalize"
            >
              {{ row.original.status }}
            </UBadge>
          </template>
          
          <template #actions-cell="{ row }">
            <div class="flex items-center justify-end">
              <UDropdownMenu v-if="isEditor" :items="getRowItems(row.original)" :content="{ align: 'end' }">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
              </UDropdownMenu>
              <span v-else class="text-xs text-neutral-400">View only</span>
            </div>
          </template>
        </UTable>

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between gap-3 border-t border-default p-4 bg-white dark:bg-neutral-900 text-sm sticky bottom-0 z-10">
          <div class="text-neutral-500">
            {{ selectedRows.length }} of {{ customers?.data?.meta?.total || 0 }} row(s) selected.
          </div>

          <div class="flex items-center gap-1.5">
            <UPagination
              v-model:page="page"
              :total="customers?.data?.meta?.total || 0"
              :items-per-page="pageSize"
            />
          </div>
        </div>
      </UDashboardPanelContent>
    </template>
  </UDashboardPanel>
</template>
