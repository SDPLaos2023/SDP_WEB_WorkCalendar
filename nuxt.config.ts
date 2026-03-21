// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.ts' },
      { code: 'lo', name: 'Lao', file: 'lo.ts' },
      { code: 'th', name: 'Thai', file: 'th.ts' }
    ],
    defaultLocale: 'lo',
    lazy: true,
    langDir: 'locales/',
    strategy: 'no_prefix'
  },

  devtools: {
    enabled: true
  },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  nitro: {
    preset: 'iis-node'
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/print.css'
  ],

  routeRules: {
    '/api/dashboard/summary': { swr: 60 }
  },

  runtimeConfig: {
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        secure: false, // Ensure cookies work on HTTP IP access
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      }
    },
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || ''
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
