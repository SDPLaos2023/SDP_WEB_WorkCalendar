<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const { user, logout, hasRole } = useAuth()
const route = useRoute()

const navigation = computed(() => {
  const links = [
    { label: t('navigation.dashboard'), icon: 'i-heroicons-home', to: '/dashboard' },
    { label: t('navigation.work_plans'), icon: 'i-heroicons-calendar-days', to: '/plans' },
    { label: t('navigation.my_tasks'), icon: 'i-heroicons-clipboard-document-check', to: '/tasks' },
  ]

  // Add management links if applicable
  if (hasRole(['SUPER_ADMIN']).value) {
    links.push({ label: t('navigation.companies'), icon: 'i-heroicons-building-office-2', to: '/companies' })
  }
  if (hasRole(['SUPER_ADMIN', 'ADMIN_COMPANY']).value) {
    links.push({ label: t('navigation.departments'), icon: 'i-heroicons-rectangle-stack', to: '/departments' })
  }
  if (hasRole(['SUPER_ADMIN', 'ADMIN_COMPANY', 'MANAGER']).value) {
    links.push({ label: t('navigation.users'), icon: 'i-heroicons-users', to: '/users' })
  }
  links.push({ label: t('navigation.reports'), icon: 'i-heroicons-chart-bar', to: '/reports' })

  return links
})

const userMenuItems = computed(() => [
  [{
    label: t('common.details'),
    icon: 'i-heroicons-user'
  }, {
    label: t('common.language') || 'Language',
    icon: 'i-heroicons-language',
    children: [
      {
        label: 'ພາສາລາວ',
        type: 'checkbox',
        checked: locale.value === 'lo',
        onSelect: (e: Event) => { e.preventDefault(); setLocale('lo') }
      },
      {
        label: 'ไทย',
        type: 'checkbox',
        checked: locale.value === 'th',
        onSelect: (e: Event) => { e.preventDefault(); setLocale('th') }
      },
      {
        label: 'English',
        type: 'checkbox',
        checked: locale.value === 'en',
        onSelect: (e: Event) => { e.preventDefault(); setLocale('en') }
      }
    ]
  }],
  [{
    label: t('auth.logout'),
    icon: 'i-heroicons-log-out',
    onSelect: logout
  }]
])
</script>

<template>
  <div class="min-h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#020617]">
    <!-- Desktop Sidebar -->
    <aside class="u-dashboard-sidebar hidden md:flex md:w-72 flex-col sticky top-0 h-screen shrink-0 z-30 bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-slate-800">
      <!-- Logo Area -->
      <div class="p-8 flex items-center gap-4">
        <div class="w-11 h-11 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <UIcon name="i-heroicons-calendar-days" class="text-white w-7 h-7" />
        </div>
        <NuxtLink to="/dashboard" class="flex flex-col">
          <span class="font-black text-2xl tracking-tighter text-slate-900 dark:text-white leading-none uppercase italic">Work <span class="text-orange-500 font-bold not-italic">Calendar</span></span>
          <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1.5 ml-0.5">Enterprise Portal</span>
        </NuxtLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-5 py-2 overflow-y-auto space-y-1">
        <UNavigationMenu orientation="vertical" :items="navigation" class="w-full" />
      </nav>

      <!-- User Profile -->
      <div class="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
        <UDropdownMenu :items="userMenuItems" :content="{ side: 'right', align: 'end' }">
          <UButton color="neutral" variant="ghost" class="w-full p-3 hover:bg-white dark:hover:bg-slate-900 shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
            <template #leading>
              <UAvatar :alt="`${user?.firstName} ${user?.lastName}`" size="md" class="ring-2 ring-orange-500/10 shadow-sm" />
            </template>
            <div class="text-left flex-1 min-w-0">
              <p class="text-[13px] font-black text-slate-900 dark:text-white truncate uppercase">{{ user?.firstName }} {{ user?.lastName }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse"></span>
                <span class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ user?.role }}</span>
              </div>
            </div>
            <UIcon name="i-heroicons-chevron-up-down" class="w-4 h-4 text-slate-500" />
          </UButton>
        </UDropdownMenu>
      </div>
    </aside>

    <!-- Mobile Top Header -->
    <header class="md:hidden sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
      <NuxtLink to="/dashboard" class="flex items-center gap-3">
        <div class="w-9 h-9 bg-orange-600 rounded-lg flex items-center justify-center shadow-md">
          <UIcon name="i-heroicons-calendar-days" class="text-white w-6 h-6" />
        </div>
        <span class="font-black text-xl tracking-tighter text-slate-900 dark:text-white italic uppercase leading-none">Work <span class="text-orange-500">Calendar</span></span>
      </NuxtLink>
      <UDropdownMenu :items="userMenuItems" :content="{ side: 'bottom', align: 'end' }">
        <UAvatar :alt="`${user?.firstName} ${user?.lastName}`" size="sm" class="cursor-pointer ring-2 ring-orange-500/20" />
      </UDropdownMenu>
    </header>

    <!-- Main Content -->
    <main class="flex-1 h-screen overflow-y-auto relative pb-24 md:pb-0 scroll-smooth bg-slate-50 dark:bg-[#020617]">
      <!-- Decorative Background Aura -->
      <div class="fixed inset-0 pointer-events-none z-[-1] opacity-50">
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-600/5 blur-[100px] rounded-full"></div>
      </div>

      <div class="p-4 sm:p-6 md:p-10 lg:p-12 max-w-[1600px] mx-auto">
        <slot />
      </div>
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-4 left-4 right-4 z-40">
      <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl flex items-center justify-around p-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <NuxtLink v-for="link in navigation" :key="link.to" :to="link.to" class="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 min-w-[70px]" :class="[route.path.startsWith(link.to) ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 dark:text-slate-500 hover:text-orange-500']">
          <UIcon :name="link.icon" class="w-6 h-6" />
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
