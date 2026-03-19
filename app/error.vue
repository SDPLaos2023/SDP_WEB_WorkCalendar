<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isDev = import.meta.dev
const previewProdError = ref(false)

// กด Alt + E เพื่อสลับดูหน้า Prod Error ในขณะที่เป็น Dev
if (isDev) {
  onMounted(() => {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'e') {
        previewProdError.value = !previewProdError.value
      }
    })
  })
}

// SEO
const title = computed(() => props.error.statusCode === 404 ? 'ບໍ່ມີໜ້ານີ້' : 'ເກິດຂໍ້ຜິດພາດ')
useSeoMeta({
  title: title.value,
  description: props.error.message
})

const handleError = () => clearError({ redirect: '/' })
const goBack = () => useRouter().back()
</script>

<template>
  <UApp>
    <!-- Development Mode: Show detailed error -->
    <div v-if="isDev && !previewProdError" class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 font-mono overflow-auto">
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <h1 class="text-3xl font-bold text-red-600 flex items-center gap-3">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-8 w-8" />
            Dev Error: {{ error.statusCode }}
          </h1>
          <div class="flex items-center gap-2">
            <p class="text-xs text-gray-500 mr-2">กด Alt + E เพื่อลองดูหน้า Prod</p>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-home" @click="handleError">
              Go Home
            </UButton>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 shadow-xl rounded-xl p-6 space-y-4 ring-1 ring-black/5">
          <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ error.statusMessage || error.message }}</p>
          <div v-if="error.stack" class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed border border-gray-700">
            <pre>{{ error.stack }}</pre>
          </div>
        </div>

        <div class="text-center text-xs text-gray-500">
          * This detailed view is only visible in development mode.
        </div>
      </div>
    </div>

    <!-- Production Mode: Show user-friendly handle -->
    <div v-else class="relative min-h-screen flex items-center justify-center p-6 bg-white dark:bg-gray-950 overflow-hidden">
      <!-- Preview Indicator (Hidden in real Prod) -->
      <div v-if="isDev" class="fixed top-4 right-4 z-50 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
        PREVIEW PROD UI (Alt + E to exit)
      </div>
      <!-- Premium Background Effects -->
      <div class="absolute inset-0 overflow-hidden -z-10">
        <div class="absolute top-1/4 -left-20 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] animate-pulse" />
        <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse" style="animation-duration: 4s" />
      </div>

      <div class="max-w-lg w-full text-center space-y-10">
        <div class="relative inline-flex items-center justify-center">
            <div class="absolute inset-0 animate-ping rounded-full bg-red-400/20" />
            <div class="relative h-24 w-24 flex items-center justify-center bg-white dark:bg-gray-900 rounded-3xl shadow-2xl ring-1 ring-red-500/20">
                <UIcon 
                    :name="error.statusCode === 404 ? 'i-heroicons-magnifying-glass' : 'i-heroicons-shield-exclamation'" 
                    class="h-12 w-12 text-red-500" 
                />
            </div>
        </div>

        <div class="space-y-4">
          <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">
            {{ error.statusCode === 404 ? 'ບໍ່ມີໜ້ານີ້' : 'ເກິດຂໍ້ຜິດພາດ' }}
          </h1>
          <p class="text-lg text-gray-500 dark:text-gray-400 px-4">
            {{ error.statusCode === 404 ? 'ຂໍອາໄພ ບໍ່ມີໜ້າທີ່ທ່ານຄົ້ນຫາ' : 'ຂໍອາໄພໃນຄວາມບໍ່ສະດວກ ມີຂໍ້ຜິດພາດບາງຢ່າງ' }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 px-8">
          <UButton
            size="xl"
            block
            class="rounded-full px-10"
            color="success"
            icon="i-heroicons-home"
            @click="handleError"
          >
            ກັບສູ່ໜ້າຫຼັກ
          </UButton>
          <UButton
            size="xl"
            block
            variant="ghost"
            class="rounded-full px-10"
            color="neutral"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          >
            ຍ້ອນໄປກ່ອນໜ້າ
          </UButton>
        </div>

        <div class="pt-10 border-t border-gray-100 dark:border-gray-800">
           <p class="text-xs uppercase tracking-widest text-gray-400 font-bold">
              Error Code: {{ error.statusCode }}
           </p>
        </div>
      </div>
    </div>
  </UApp>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
