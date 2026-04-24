import type { AsyncDataOptions } from 'nuxt/app'
import { type MaybeRefOrGetter, toValue } from 'vue'

export function useApi<T>(path: MaybeRefOrGetter<string | null>, options?: AsyncDataOptions<T>) {
  const config = useRuntimeConfig()
  const tokenCookie = useCookie<string | null>('access_token')

  const resolvedPath = computed(() => toValue(path))

  return useAsyncData<T>(
    computed(() => toValue(path) ?? '__noop__') as unknown as string,
    async () => {
      const p = toValue(path)
      if (!p) return null as unknown as T
      const apiUrl = import.meta.server ? config.apiUrl : config.public.apiUrl
      return $fetch<T>(`${apiUrl}${p}`, {
        headers: tokenCookie.value ? { Authorization: `Bearer ${tokenCookie.value}` } : {},
      })
    },
    { ...options, watch: [resolvedPath, ...(options?.watch ?? [])] },
  )
}

export async function $api<T>(path: string, options?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const config = useRuntimeConfig()
  const tokenCookie = useCookie<string | null>('access_token')

  const { query, ...fetchOptions } = options ?? {}
  let fullPath = `${config.public.apiUrl}${path}`
  if (query) {
    const params = new URLSearchParams(query)
    fullPath += `?${params}`
  }

  return $fetch<T>(fullPath, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions?.headers as Record<string, string> | undefined),
      ...(tokenCookie.value ? { Authorization: `Bearer ${tokenCookie.value}` } : {}),
    },
  })
}
