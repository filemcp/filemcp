import { describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import MarkdownRenderer from './MarkdownRenderer.vue'

const htmlContent = '<h1>Hello</h1><p>World</p>'

async function mountMarkdown(commentMode = false, comments: any[] = []) {
  vi.mocked((globalThis as any).useFetch).mockReturnValue({
    data: ref(htmlContent),
    pending: ref(false),
    error: ref(null),
    refresh: vi.fn(),
  })
  const wrapper = mount(
    defineComponent({
      components: { MarkdownRenderer },
      template: '<Suspense><MarkdownRenderer :content-url="url" :comment-mode="mode" :comments="c" :current-version-id="vid" /></Suspense>',
      setup() { return { url: 'http://cdn/file.md', mode: commentMode, c: comments, vid: 'version-1' } },
    }),
    { global: { stubs: { CommentPin: true } } },
  )
  await flushPromises()
  return wrapper
}

describe('MarkdownRenderer', () => {
  it('renders the HTML string via v-html', async () => {
    const wrapper = await mountMarkdown()
    expect(wrapper.find('article').html()).toContain('<h1>Hello</h1>')
  })

  it('emits click with position and selectorHint when commentMode is true', async () => {
    const wrapper = await mountMarkdown(true)
    const container = wrapper.find('div.relative')
    await container.trigger('click', { clientX: 100, clientY: 50 })
    const inner = wrapper.findComponent(MarkdownRenderer)
    const emitted = inner.emitted('click')
    expect(emitted).toBeTruthy()
    const payload = (emitted as any)[0][0]
    expect(payload).toHaveProperty('xPct')
    expect(payload).toHaveProperty('yPct')
    expect(payload).toHaveProperty('selectorHint')
  })

  it('does not emit click when commentMode is false', async () => {
    const wrapper = await mountMarkdown(false)
    await wrapper.find('div.relative').trigger('click')
    const inner = wrapper.findComponent(MarkdownRenderer)
    expect(inner.emitted('click')).toBeFalsy()
  })
})
