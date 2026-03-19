<script setup lang="ts">
import { loginSchema } from '~~/shared/schemas/auth.schema'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  layout: 'auth'
})

const { login, loading, error } = useAuth()
const toast = useToast()

const state = reactive({
  username: '',
  password: ''
})

const showPassword = ref(false)

async function onSubmit(event: FormSubmitEvent<any>) {
  try {
    await login(state.username, state.password)
    toast.add({
      title: 'Login Successful',
      description: 'System connection established. Routing to dashboard...',
      color: 'success'
    })
    navigateTo('/dashboard')
  } catch (err: any) {
    toast.add({
      title: 'Access Denied',
      description: err.data?.statusMessage || 'Invalid credentials or expired session.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-8">
    <UForm :schema="loginSchema" :state="state" class="space-y-8" @submit="onSubmit">
      <div class="space-y-6">
        <!-- Structured Identity Input -->
        <div class="space-y-3">
          <div class="flex justify-between items-center px-1">
            <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <UIcon name="i-heroicons-identification" class="w-4 h-4 text-orange-500" />
              Corporate Identity
            </label>
          </div>
          <UInput
            v-model="state.username"
            placeholder="Username"
            size="xl"
            variant="none"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all text-slate-900 dark:text-white px-2 font-semibold"
            :ui="{
              base: 'h-14 bg-transparent border-none'
            }"
          />
        </div>

        <!-- Structured Password Input -->
        <div class="space-y-3">
          <div class="flex justify-between items-center px-1">
            <label class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 text-orange-500" />
              Access Credentials
            </label>
            <button type="button" class="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest">
              Recovery?
            </button>
          </div>
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            size="xl"
            variant="none"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all text-white px-2 font-semibold"
            :ui="{
              base: 'h-14 bg-transparent border-none'
            }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                class="hover:bg-transparent"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </div>
      </div>

      <!-- Formal Error Messaging -->
      <div v-if="error" class="p-4 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-shake flex items-start gap-3">
        <UIcon name="i-heroicons-shield-exclamation" class="w-5 h-5 flex-shrink-0" />
        <div class="space-y-1">
          <p class="uppercase tracking-widest text-[10px]">Security Incident</p>
          <span class="font-medium opacity-80 leading-relaxed">{{ error }}</span>
        </div>
      </div>

      <UButton
        type="submit"
        block
        size="xl"
        :loading="loading"
        class="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-[0.25em] py-7 shadow-xl shadow-orange-500/10 active:scale-[0.98] transition-all cursor-pointer rounded-xl group"
      >
        Authorize & Enter
        <template #trailing>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </template>
      </UButton>

      <div class="flex items-center justify-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,1)]"></span>
        <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Encrypted Connection Active</span>
      </div>
    </UForm>
  </div>
</template>

<style scoped>
.animate-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

:deep(input)::placeholder {
  color: #94a3b8; /* slate-400 */
  font-weight: 500;
  letter-spacing: 0.02em;
}

.dark :deep(input)::placeholder {
  color: #475569; /* slate-600 */
}
</style>
