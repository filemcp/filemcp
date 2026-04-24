export default defineNuxtConfig({
  devtools: { enabled: false },

  app: {
    head: {
      script: [
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-PWPG88HHHM',
          async: true,
        },
        {
          innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-PWPG88HHHM');`,
        },
      ],
    },
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
  ],

  runtimeConfig: {
    // Server-side only — direct connection to NestJS (container-to-container in Docker)
    apiUrl: process.env.NUXT_API_URL ?? 'http://localhost:4000/api',
    public: {
      // Browser-accessible — goes through the Nuxt server route proxy at /api/**
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? '/api',
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? '',
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
    '/u/**': { ssr: true },
    '/': { prerender: true },
    '/api/**': { proxy: `${process.env.NUXT_API_URL ?? 'http://localhost:4000/api'}/**` },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
