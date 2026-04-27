export default defineNuxtConfig({
  devtools: { enabled: false },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
      meta: [
        // OG/Twitter defaults — per-page useSeoMeta overrides title/description/image
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'FileMCP' },
        { property: 'og:locale', content: 'en_US' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
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
      appUrl: process.env.NUXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? '',
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
