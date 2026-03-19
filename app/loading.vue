<template>
  <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl">
    <div class="relative flex items-center justify-center h-24 w-24">
      <div class="absolute inset-0 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin" />
      <div class="h-12 w-12 flex items-center justify-center bg-white dark:bg-gray-900 rounded-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10">
        <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 text-green-500 animate-spin" />
      </div>
    </div>
    <div class="mt-8 text-center space-y-2">
      <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        loading...
      </h2>
      <div class="flex items-center justify-center gap-1.5">
        <div class="h-1 w-1 rounded-full bg-green-500 animate-bounce [animation-delay:-0.3s]" />
        <div class="h-1 w-1 rounded-full bg-green-500 animate-bounce [animation-delay:-0.15s]" />
        <div class="h-1 w-1 rounded-full bg-green-500 animate-bounce" />
      </div>
    </div>
  </div>
</template>
