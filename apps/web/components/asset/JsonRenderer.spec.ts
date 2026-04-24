import { describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import JsonRenderer from './JsonRenderer.vue'

async function mountJson(contentUrl: string) {
  const wrapper = mount(
    defineComponent({
      components: { JsonRenderer },
      template: '<Suspense><JsonRenderer :content-url="url" /></Suspense>',
      setup() { return { url: contentUrl } },
    }),
  )
  await flushPromises()
  return wrapper
}

function mockFetch(value: string) {
  vi.mocked((globalThis as any).useFetch).mockReturnValue({
    data: ref(value),
    pending: ref(false),
    error: ref(null),
    refresh: vi.fn(),
  })
}

describe('JsonRenderer', () => {
  it('pretty-prints valid JSON', async () => {
    mockFetch('{"a":1,"b":true}')
    const wrapper = await mountJson('http://cdn/file.json')
    expect(wrapper.find('pre').text()).toBe(JSON.stringify({ a: 1, b: true }, null, 2))
  })

  it('falls back to raw string when JSON is invalid', async () => {
    mockFetch('not-json')
    const wrapper = await mountJson('http://cdn/file.json')
    expect(wrapper.find('pre').text()).toBe('not-json')
  })
})
