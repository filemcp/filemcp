import { describe, it, expect, vi } from 'vitest'
import guestMiddleware from './guest'

describe('guest middleware', () => {
  it('redirects to /dashboard when authenticated', () => {
    ;(globalThis as any).useCookie('access_token').value = 'valid-token'
    guestMiddleware({} as any, {} as any)
    expect(vi.mocked((globalThis as any).navigateTo)).toHaveBeenCalledWith('/dashboard')
  })

  it('does not redirect when not authenticated', () => {
    guestMiddleware({} as any, {} as any)
    expect(vi.mocked((globalThis as any).navigateTo)).not.toHaveBeenCalled()
  })
})
