import { ref, computed, reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'

// Provide Vue composables as globals (Nuxt normally auto-imports these)
Object.assign(globalThis, { ref, computed, reactive })

// Mock useCookie: returns a simple ref backed by an in-memory map
const cookieStore: Record<string, any> = {}
;(globalThis as any).useCookie = (key: string, _opts?: any) => {
  if (!(key in cookieStore)) cookieStore[key] = ref(null)
  return cookieStore[key]
}

beforeEach(() => {
  // Reset Pinia state
  setActivePinia(createPinia())
  // Reset cookies
  for (const key of Object.keys(cookieStore)) {
    cookieStore[key].value = null
  }
  // Reset localStorage (happy-dom provides this)
  localStorage.clear()
})
