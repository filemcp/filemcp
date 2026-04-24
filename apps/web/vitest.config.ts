import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'

// Replace Nuxt-specific import.meta properties for the test environment
function nuxtMetaPlugin(): Plugin {
  return {
    name: 'nuxt-import-meta',
    transform(code, id) {
      if (id.includes('node_modules')) return
      return code
        .replace(/\bimport\.meta\.client\b/g, 'true')
        .replace(/\bimport\.meta\.server\b/g, 'false')
    },
  }
}

export default defineConfig({
  plugins: [vue(), nuxtMetaPlugin()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '~': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
