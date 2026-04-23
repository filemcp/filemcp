export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
  ],

  runtimeConfig: {
    // Server-side only — uses Docker internal hostname
    apiUrl: process.env.NUXT_API_URL ?? 'http://localhost:4000/api',
    public: {
      // Browser-accessible
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
    '/u/**': { ssr: true },
    '/': { prerender: true },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
