import { describe, it, expect, vi } from 'vitest'
import authPlugin from './auth.client'
import { useAuthStore } from '~/stores/auth.store'

describe('auth.client plugin', () => {
  it('calls loadFromStorage on initialization', () => {
    const auth = useAuthStore()
    const spy = vi.spyOn(auth, 'loadFromStorage')
    authPlugin({} as any)
    expect(spy).toHaveBeenCalledOnce()
  })
})
