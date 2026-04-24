import { describe, it, expect, vi, beforeEach } from 'vitest'
import { $api } from './useApi'

const mockFetch = vi.mocked((globalThis as any).$fetch)

function setToken(value: string | null) {
  ;(globalThis as any).useCookie('access_token').value = value
}

describe('$api', () => {
  beforeEach(() => {
    setToken(null)
  })

  it('sends request to the correct full URL', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await $api('/assets')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('http://api.test/assets')
  })

  it('includes Authorization header when token cookie has a value', async () => {
    setToken('my-token')
    mockFetch.mockResolvedValue({})
    await $api('/assets')
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts as any).headers).toMatchObject({ Authorization: 'Bearer my-token' })
  })

  it('omits Authorization header when token is null', async () => {
    mockFetch.mockResolvedValue({})
    await $api('/assets')
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts as any).headers).not.toHaveProperty('Authorization')
  })

  it('appends query params to the URL', async () => {
    mockFetch.mockResolvedValue({})
    await $api('/assets', { query: { page: '2', limit: '10' } })
    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url as string)
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('limit')).toBe('10')
  })

  it('merges caller-supplied headers with auth header', async () => {
    setToken('tok')
    mockFetch.mockResolvedValue({})
    await $api('/assets', { headers: { 'X-Custom': 'yes' } })
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts as any).headers).toMatchObject({
      Authorization: 'Bearer tok',
      'X-Custom': 'yes',
    })
  })

  it('passes method and body through to $fetch', async () => {
    mockFetch.mockResolvedValue({})
    await $api('/assets', { method: 'POST', body: JSON.stringify({ name: 'x' }) })
    const [, opts] = mockFetch.mock.calls[0]
    expect((opts as any).method).toBe('POST')
    expect((opts as any).body).toBe(JSON.stringify({ name: 'x' }))
  })
})
