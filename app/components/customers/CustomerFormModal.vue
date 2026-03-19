<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  customer?: any 
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success', 'close'])

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email address'),
  status: z.enum(['subscribed', 'unsubscribed', 'bounced']),
  location: z.string().optional().or(z.literal(''))
})

type Schema = z.infer<typeof schema>

const state = reactive({
  name: props.customer?.name || '',
  email: props.customer?.email || '',
  status: props.customer?.status || 'subscribed',
  location: props.customer?.location || ''
})

const { execute: saveCustomer, loading } = useApiAction()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const url = props.customer ? `/api/customers/${props.customer.id}` : '/api/customers'
  const method = props.customer ? 'PATCH' : 'POST'
  
  const { error } = await saveCustomer(
    () => $fetch(url as any, { method: method as any, body: state }) as any,
    { successMessage: props.customer ? 'ແກ້ໄຂຂໍ້ມູນສຳເລັດ' : 'ສ້າງ Customer ສຳເລັດ' }
  )

  if (!error) {
    emit('success')
  }
}

watch(() => props.customer, (newVal) => {
  if (newVal) {
    state.name = newVal.name
    state.email = newVal.email
    state.status = newVal.status
    state.location = newVal.location || ''
  } else {
    state.name = ''
    state.email = ''
    state.status = 'subscribed'
    state.location = ''
  }
}, { immediate: true })
</script>

<template>
  <UModal v-model:open="open" :title="customer ? 'Edit Customer' : 'Create Customer'">
    <slot />

    <template #content>
      <UForm :schema="schema" :state="state" class="p-6 space-y-4" @submit="onSubmit">
        <h3 class="text-lg font-semibold mb-4">{{ customer ? 'Edit Customer' : 'Create Customer' }}</h3>
        
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" icon="i-lucide-user" placeholder="Full Name" />
        </UFormField>
        
        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" icon="i-lucide-mail" placeholder="email@example.com" />
        </UFormField>
        
        <UFormField label="Location" name="location">
          <UInput v-model="state.location" class="w-full" icon="i-lucide-map-pin" placeholder="City, Country" />
        </UFormField>
        
        <UFormField label="Status" name="role">
          <USelect 
            v-model="state.status" 
            :items="[
                { label: 'Subscribed', value: 'subscribed' },
                { label: 'Unsubscribed', value: 'unsubscribed' },
                { label: 'Bounced', value: 'bounced' }
            ]" 
            class="w-full" 
          />
        </UFormField>
        
        <div class="flex justify-end gap-3 pt-6 border-t border-default">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="open = false; $emit('close')" />
          <UButton type="submit" :label="customer ? 'Update Data' : 'Save Data'" :loading="loading" icon="i-lucide-save" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
