<script setup lang="ts">
const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;700&family=Public+Sans:wght@400;500;600&family=Noto+Sans+Lao:wght@400;700&display=swap' }
  ],
  htmlAttrs: {
    lang: 'th'
  }
})

const title = 'Work Calendar'
const description = 'Work Calendar - Annual work planning and tracking system for organizations.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/icon.svg', // Will show the site icon
  twitterImage: '/icon.svg',
  twitterCard: 'summary' // Use 'summary' instead of 'summary_large_image' for simple icons
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <!-- <ClientOnly>
      <AppLoading />
    </ClientOnly> -->

    <NuxtLayout>
      <Transition name="page" mode="out-in">
        <NuxtPage />
      </Transition>
    </NuxtLayout>

    <UNotifications />
    <UModals />
  </UApp>
</template>
