import { describe, it, expect, vi } from 'vitest'
import authMiddleware from './auth'
import { useAuthStore } from '~/stores/auth.store'

describe('auth middleware', () => {
  it('redirects to /login when not authenticated', () => {
    const auth = useAuthStore()
    // token cookie is null by default → isAuthenticated is false
    authMiddleware({} as any, {} as any)
    expect(vi.mocked((globalThis as any).navigateTo)).toHaveBeenCalledWith('/login')
  })

  it('does not redirect when authenticated', () => {
    const auth = useAuthStore()
    ;(globalThis as any).useCookie('access_token').value = 'valid-token'
    authMiddleware({} as any, {} as any)
    expect(vi.mocked((globalThis as any).navigateTo)).not.toHaveBeenCalled()
  })
})
