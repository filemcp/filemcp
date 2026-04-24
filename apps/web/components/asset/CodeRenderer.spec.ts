import { describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import CodeRenderer from './CodeRenderer.vue'

async function mountCode(contentUrl: string, fileType = 'TYPESCRIPT') {
  const wrapper = mount(
    defineComponent({
      components: { CodeRenderer },
      template: '<Suspense><CodeRenderer :content-url="url" :file-type="type" /></Suspense>',
      setup() { return { url: contentUrl, type: fileType } },
    }),
  )
  await flushPromises()
  return wrapper
}

describe('CodeRenderer', () => {
  it('renders fetched content inside a pre element', async () => {
    vi.mocked((globalThis as any).useFetch).mockReturnValue({
      data: ref('const x = 1'),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    })
    const wrapper = await mountCode('http://cdn/file.ts')
    expect(wrapper.find('pre').text()).toBe('const x = 1')
  })
})
