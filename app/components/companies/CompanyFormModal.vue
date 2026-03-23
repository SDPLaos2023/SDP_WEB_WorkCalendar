<script setup lang="ts">
const { t } = useI18n()
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
const CompanySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase()
})

const props = defineProps<{
  company?: any // Edit mode if company is provided
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success', 'close'])

const { apiFetch } = useAuth()
const loading = ref(false)

const state = reactive({
  name: '',
  code: ''
})

// Reset form
watch(() => props.company, (newVal) => {
  if (newVal) {
    state.name = newVal.name || ''
    state.code = newVal.code || ''
  } else {
    state.name = ''
    state.code = ''
  }
}, { immediate: true })

// Clear form on close
watch(open, (isOpen) => {
  if (!isOpen && !props.company) {
    state.name = ''
    state.code = ''
  }
})

async function onSubmit(event: FormSubmitEvent<z.infer<typeof CompanySchema>>) {
  loading.value = true
  try {
    const url = props.company ? `/api/companies/${props.company.id}` : '/api/companies'
    const method = props.company ? 'PATCH' : 'POST'

    await apiFetch(url, {
      method,
      body: state
    })

    useToast().add({ title: t('common.success'), description: `Company saved successfully`, color: 'success' })
    emit('success')
    open.value = false
  } catch (err: any) {
    useToast().add({ title: t('common.error'), description: err.data?.statusMessage || err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="company ? t('common.edit') : t('common.create')" :description="company ? `Editing ${company.name}` : 'Add a new company to the system'">
    <template #content>
      <UForm :schema="CompanySchema" :state="state" class="p-6 space-y-4" @submit="onSubmit">
        <h3 class="text-lg font-semibold mb-4">{{ company ? t('common.edit') : t('common.create') }}</h3>

        <UFormField :label="t('management.company')" name="name">
          <UInput v-model="state.name" class="w-full" placeholder="Enter company name" />
        </UFormField>

        <UFormField label="Code" name="code">
  <UInput
    v-model="state.code"
    class="w-full uppercase"
    placeholder="e.g. ABC"
    @update:model-value="val => state.code = val.toUpperCase()"
  />
</UFormField>

        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <UButton :label="t('common.cancel')" color="neutral" variant="ghost" @click="open = false; $emit('close')" />
          <UButton type="submit" :label="company ? t('common.save') : t('common.create')" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
