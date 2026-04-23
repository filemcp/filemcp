import type { UseFetchOptions } from 'nuxt/app'

export function useApi<T>(path: string, options?: UseFetchOptions<T>) {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const apiUrl = import.meta.server ? config.apiUrl : config.public.apiUrl

  const url = `${apiUrl}${path}`

  return useFetch<T>(url, {
    ...options,
    key: path,
    headers: {
      ...options?.headers,
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  })
}

export async function $api<T>(path: string, options?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const { query, ...fetchOptions } = options ?? {}
  const url = new URL(`${config.public.apiUrl}${path}`)
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await $fetch<T>(url.toString(), {
    ...fetchOptions,
    headers: {
      ...fetchOptions?.headers,
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  })

  return res
}
