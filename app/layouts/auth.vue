<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 font-sans selection:bg-orange-500/30">
    <!-- Left Section: Visual & Branding (Structured Grid) -->
    <div class="hidden lg:flex flex-col justify-between p-12 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative overflow-hidden">
      <!-- Grid Background Pattern -->
      <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style="background-image: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); background-size: 50px 50px;"></div>
      <div class="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent"></div>

      <!-- Top: Logo -->
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-xl shadow-orange-500/20">
          <UIcon name="i-heroicons-calendar-days" class="text-white w-7 h-7" />
        </div>
        <div>
          <h1 class="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic leading-none">Work <span class="text-orange-500 font-bold not-italic">Calendar</span></h1>
          <p class="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400 mt-1">Enterprise Management</p>
        </div>
      </div>

      <!-- Center: Formal Messaging -->
      <div class="relative z-10 max-w-md">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest mb-6 border border-orange-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          Professional Efficiency
        </div>
        <h2 class="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
          Streamline your <span class="text-orange-500">organization</span> with precision.
        </h2>
        <p class="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          The ultimate structured environment for project planning, task tracking, and workforce compliance.
        </p>
      </div>

      <!-- Bottom: Trust Footer -->
      <div class="relative z-10 border-t border-slate-100 dark:border-slate-800 pt-8 flex items-center gap-8">
        <div class="flex flex-col">
          <span class="text-xl font-black text-slate-900 dark:text-white italic">100%</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure Protocol</span>
        </div>
        <div class="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
        <div class="flex flex-col">
          <span class="text-xl font-black text-slate-900 dark:text-white italic">24/7</span>
          <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">System Uptime</span>
        </div>
      </div>
    </div>

    <!-- Right Section: Login Interface -->
    <div class="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 relative">
      <!-- Mobile Logo (Small) -->
      <div class="lg:hidden absolute top-8 left-8 flex items-center gap-3">
        <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <UIcon name="i-heroicons-calendar-days" class="text-white w-6 h-6" />
        </div>
        <h1 class="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Work <span class="text-orange-500">Calendar</span></h1>
      </div>

      <div class="w-full max-w-[440px] space-y-10">
        <div class="text-center lg:text-left">
          <div class="text-[11px] font-black uppercase tracking-[0.4em] text-orange-500 mb-2">Secure Gateway</div>
          <h3 class="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3 italic uppercase">Portal <span class="text-slate-400 dark:text-slate-600">Login</span></h3>
          <p class="text-slate-500 dark:text-slate-400 font-medium">Please enter your credentials to access the enterprise suite.</p>
        </div>

        <div class="u-card p-8 lg:p-10 border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden bg-white dark:bg-slate-900">
          <slot />
        </div>

        <div class="flex items-center justify-between px-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <UIcon name="i-heroicons-globe-alt" class="w-4 h-4" />
            V4.0 Stable
          </span>
          <div class="flex gap-4">
            <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-slate-300 dark:text-slate-700 hover:text-orange-500 transition-colors cursor-help" />
            <UIcon name="i-heroicons-finger-print" class="w-5 h-5 text-slate-300 dark:text-slate-700" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No extra styles needed, using Tailwind's robust grid and design tokens */
</style>
