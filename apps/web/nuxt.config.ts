export default defineNuxtConfig({
  devtools: { enabled: true },

  vite: {
    server: {
      allowedHosts: true,
    },
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
  ],

  runtimeConfig: {
    // Server-side only — direct connection to NestJS
    apiUrl: process.env.NUXT_API_URL ?? 'http://localhost:4000/api',
    public: {
      // Browser-accessible — relative so it works through any tunnel/proxy
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '/api',
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? '',
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
    '/u/**': { ssr: true },
    '/': { prerender: true },
    '/api/**': { proxy: `${process.env.NUXT_API_URL ?? 'http://localhost:4000/api'}/**` }
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
