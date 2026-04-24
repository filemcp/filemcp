import { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick, defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth.store'
import { useCommentStore } from '~/stores/comment.store'

// Provide Vue composables as globals (Nuxt normally auto-imports these)
Object.assign(globalThis, { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick, defineComponent })

// Pinia store constructors — Nuxt auto-imports these; tests access them as globals
Object.assign(globalThis, { useAuthStore, useCommentStore })

// Mock useCookie: returns a simple ref backed by an in-memory map
const cookieStore: Record<string, any> = {}
;(globalThis as any).useCookie = (key: string, _opts?: any) => {
  if (!(key in cookieStore)) cookieStore[key] = ref(null)
  return cookieStore[key]
}

// Nuxt runtime mocks
;(globalThis as any).useRuntimeConfig = vi.fn(() => ({
  apiUrl: 'http://api.test',
  public: { apiUrl: 'http://api.test' },
}))

;(globalThis as any).$fetch = vi.fn()
;(globalThis as any).navigateTo = vi.fn()
;(globalThis as any).useRoute = vi.fn(() => ({ params: {}, query: {} }))
;(globalThis as any).useFetch = vi.fn(() => ({
  data: ref(null),
  pending: ref(false),
  error: ref(null),
  refresh: vi.fn(),
}))
;(globalThis as any).useAsyncData = vi.fn(() => ({
  data: ref(null),
  pending: ref(false),
  error: ref(null),
  refresh: vi.fn(),
}))

// Nuxt plugin/middleware wrappers are pass-throughs in tests
;(globalThis as any).defineNuxtRouteMiddleware = (fn: any) => fn
;(globalThis as any).defineNuxtPlugin = (fn: any) => fn

// Auto-imported $api stub (overridden per-test as needed)
;(globalThis as any).$api = vi.fn()

beforeEach(() => {
  // Reset Pinia state
  setActivePinia(createPinia())
  // Reset cookies
  for (const key of Object.keys(cookieStore)) {
    cookieStore[key].value = null
  }
  // Reset localStorage (happy-dom provides this)
  localStorage.clear()
  // Reset call history on shared mocks
  vi.mocked((globalThis as any).$fetch).mockReset()
  vi.mocked((globalThis as any).navigateTo).mockReset()
  vi.mocked((globalThis as any).$api).mockReset()
})
