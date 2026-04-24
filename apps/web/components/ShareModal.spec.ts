import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ShareModal from './ShareModal.vue'

const defaultProps = { org: 'acme', uuid: 'abc-123' }

let clipboardWriteText: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('location', { origin: 'http://localhost:3000' })
  clipboardWriteText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText: clipboardWriteText } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mountModal(props = defaultProps) {
  return mount(ShareModal, {
    props,
    global: {
      stubs: { Teleport: true },
    },
    attachTo: document.body,
  })
}

describe('ShareModal', () => {
  it('default URL has no query param (comments mode)', () => {
    const wrapper = mountModal()
    expect(wrapper.find('span.font-mono').text()).toBe('http://localhost:3000/u/acme/abc-123')
  })

  it('clicking View only adds ?mode=view to URL', async () => {
    const wrapper = mountModal()
    const viewBtn = wrapper.findAll('button').find(b => b.text().includes('View only'))!
    await viewBtn.trigger('click')
    expect(wrapper.find('span.font-mono').text()).toBe('http://localhost:3000/u/acme/abc-123?mode=view')
  })

  it('clicking With comments removes query param', async () => {
    const wrapper = mountModal()
    const viewBtn = wrapper.findAll('button').find(b => b.text().includes('View only'))!
    const commentsBtn = wrapper.findAll('button').find(b => b.text().includes('With comments'))!
    await viewBtn.trigger('click')
    await commentsBtn.trigger('click')
    expect(wrapper.find('span.font-mono').text()).not.toContain('mode=view')
  })

  it('Copy button calls clipboard.writeText with the current URL', async () => {
    const wrapper = mountModal()
    const copyBtn = wrapper.findAll('button').find(b => b.text() === 'Copy')!
    await copyBtn.trigger('click')
    expect(clipboardWriteText).toHaveBeenCalledWith('http://localhost:3000/u/acme/abc-123')
  })

  it('Copy button shows Copied! then resets after 2s', async () => {
    vi.useFakeTimers()
    const wrapper = mountModal()
    const copyBtn = wrapper.findAll('button').find(b => b.text() === 'Copy')!
    await copyBtn.trigger('click')
    await nextTick()
    expect(wrapper.findAll('button').find(b => b.text() === 'Copied!')?.exists()).toBe(true)
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(wrapper.findAll('button').find(b => b.text() === 'Copy')?.exists()).toBe(true)
    vi.useRealTimers()
  })

  it('X button emits close', async () => {
    const wrapper = mountModal()
    // The header close button (SVG button, not mode toggle buttons)
    const closeBtn = wrapper.find('button[class*="text-zinc-5"]')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clicking the backdrop emits close', async () => {
    const wrapper = mountModal()
    const backdrop = wrapper.find('div[class*="fixed inset-0"]')
    const el = backdrop.element as HTMLElement
    const event = new MouseEvent('click', { bubbles: false })
    Object.defineProperty(event, 'target', { value: el, configurable: true })
    Object.defineProperty(event, 'currentTarget', { value: el, configurable: true })
    el.dispatchEvent(event)
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('clicking inside the modal does NOT emit close', async () => {
    const wrapper = mountModal()
    await wrapper.find('div[class*="bg-zinc-900 border"]').trigger('click')
    expect(wrapper.emitted('close')).toBeFalsy()
  })
})
