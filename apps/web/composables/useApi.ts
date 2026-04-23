import type { AsyncDataOptions } from 'nuxt/app'
import { type MaybeRefOrGetter, toValue } from 'vue'

export function useApi<T>(path: MaybeRefOrGetter<string | null>, options?: AsyncDataOptions<T>) {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const tokenCookie = useCookie<string | null>('access_token')

  const resolvedPath = computed(() => toValue(path))

  return useAsyncData<T>(
    computed(() => toValue(path) ?? '__noop__') as unknown as string,
    async () => {
      const p = toValue(path)
      if (!p) return null as unknown as T
      const apiUrl = import.meta.server ? config.apiUrl : config.public.apiUrl
      const token = auth.token ?? tokenCookie.value
      return $fetch<T>(`${apiUrl}${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
    { ...options, watch: [resolvedPath, ...(options?.watch ?? [])] },
  )
}

export async function $api<T>(path: string, options?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const { query, ...fetchOptions } = options ?? {}
  const url = new URL(`${config.public.apiUrl}${path}`)
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  return $fetch<T>(url.toString(), {
    ...fetchOptions,
    headers: {
      ...(fetchOptions?.headers as Record<string, string> | undefined),
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  })
}
