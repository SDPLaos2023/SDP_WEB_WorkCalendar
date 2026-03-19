<script setup lang="ts">
definePageMeta({
  layout: false
})

const { isLoggedIn } = useAuth()

onMounted(() => {
  // Check login status after 1s splash
  setTimeout(() => {
    if (isLoggedIn.value) {
      navigateTo('/dashboard')
    } else {
      navigateTo('/login')
    }
  }, 1000)
})
</script>

<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-neutral-950 z-[9999]">
    <div class="relative flex items-center justify-center">
      <!-- Outer Ring -->
      <div class="size-20 border-4 border-orange-500/10 rounded-full animate-pulse"></div>
      <!-- Inner Spinner -->
      <div class="absolute size-20 border-4 border-transparent border-t-orange-600 rounded-full animate-spin"></div>
      <!-- Logo or Icon in center -->
      <UIcon name="i-heroicons-calendar-days" class="absolute size-8 text-orange-600 animate-bounce" />
    </div>
    
    <div class="mt-8 flex flex-col items-center gap-2 text-center font-sans">
      <h2 class="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white italic">Work <span class="text-orange-500">Calendar</span></h2>
      <p class="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-tight animate-pulse">กำลังเริ่มต้นระบบบริหารจัดการองค์กร...</p>
    </div>

    <!-- Background Decoration -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 size-[500px] bg-orange-500/5 rounded-full blur-3xl opacity-50 pulse-bg animate-pulse"></div>
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pulse-bg {
  animation: pulse-bg 4s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.5; }
}

.LaoFont {
  font-family: 'Noto Sans Lao', sans-serif;
}
</style>
