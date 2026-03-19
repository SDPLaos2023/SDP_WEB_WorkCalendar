<script setup lang="ts">
const indicator = useLoadingIndicator()
const { isLoading, progress } = indicator
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-700 ease-in-out"
    enter-from-class="opacity-0 backdrop-blur-0"
    enter-to-class="opacity-100 backdrop-blur-xl"
    leave-active-class="transition-all duration-500 ease-in-out"
    leave-from-class="opacity-100 backdrop-blur-xl"
    leave-to-class="opacity-0 backdrop-blur-0"
  >
    <div
      v-if="isLoading"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl transition-all"
    >
      <!-- Background Decorative Blobs -->
      <div class="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div class="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[120px] animate-pulse" />
        <div class="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-green-600/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 1s" />
      </div>

      <div class="relative scale-110 lg:scale-125">
        <!-- Floating Circles -->
        <div class="absolute -inset-8 animate-[spin_4s_linear_infinite]">
          <div class="h-4 w-4 rounded-full bg-green-500/40 absolute top-0 left-1/2 -ml-2 blur-sm" />
        </div>
        <div class="absolute -inset-12 animate-[spin_6s_linear_infinite_reverse]">
          <div class="h-3 w-3 rounded-full bg-green-400/30 absolute bottom-0 left-1/2 -ml-1.5 blur-sm" />
        </div>

        <!-- Main Spinner -->
        <div class="relative flex items-center justify-center h-24 w-24">
          <svg class="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
            <!-- Background Path -->
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              class="text-gray-200 dark:text-gray-800"
            />
            <!-- Progress Path -->
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke="currentColor"
              stroke-width="5"
              stroke-linecap="round"
              stroke-dasharray="283"
              :stroke-dashoffset="283 - (283 * progress) / 100"
              class="text-green-500 transition-all duration-500 ease-out"
            />
          </svg>
          
          <!-- Center Icon -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="relative h-12 w-12 flex items-center justify-center bg-white dark:bg-gray-900 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden group">
               <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 text-green-500 animate-spin" />
               <div class="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-12 text-center space-y-3">
        <h2 class="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
           loading ...
        </h2>
        
        <div class="flex items-center justify-center gap-2">
           <div v-for="i in 3" :key="i" 
             class="h-1.5 w-1.5 rounded-full bg-green-500 animate-bounce"
             :style="{ animationDelay: `${(i-1) * 0.1}s` }"
           />
        </div>
        
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest opacity-60">
           {{ Math.round(progress) }}% Loaded
        </p>
      </div>

      <!-- Bottom Glass Progress Bar (Optional additional indicator) -->
      <div class="fixed bottom-12 left-1/2 -translate-x-1/2 w-48 h-1 overflow-hidden rounded-full bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div 
          class="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin 8s linear infinite;
}

.animate-spin-reverse {
  animation: spin 10s linear infinite reverse;
}
</style>
