import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import CommentCompose from './CommentCompose.vue'

const defaultAnchor = { xPct: 0.5, yPct: 0.3, selectorHint: 'div>p' }
const defaultProps = { anchor: defaultAnchor, assetId: 'asset-1', versionId: 'version-1' }

function mountCompose(props = defaultProps) {
  return mount(CommentCompose, {
    props,
    global: { stubs: { NuxtLink: true } },
    attachTo: document.body,
  })
}

function submitBtn(wrapper: ReturnType<typeof mountCompose>) {
  return wrapper.findAll('button').find(b => b.text().includes('Post comment'))!
}

function cancelBtn(wrapper: ReturnType<typeof mountCompose>) {
  return wrapper.findAll('button').find(b => b.text() === '✕')!
}

describe('CommentCompose', () => {
  describe('anon field visibility', () => {
    it('shows anon name and email fields when not authenticated', () => {
      const wrapper = mountCompose()
      expect(wrapper.find('input[placeholder*="Your name"]').exists()).toBe(true)
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    })

    it('hides anon fields when authenticated', () => {
      const auth = useAuthStore()
      auth.setSession('tok', { id: '1', username: 'u', email: 'u@x.com' })
      const wrapper = mountCompose()
      expect(wrapper.find('input[placeholder*="Your name"]').exists()).toBe(false)
    })
  })

  describe('validation', () => {
    it('does not call $api and marks body invalid when body is empty', async () => {
      const wrapper = mountCompose()
      await submitBtn(wrapper).trigger('click')
      await nextTick()
      expect(vi.mocked((globalThis as any).$api)).not.toHaveBeenCalled()
      expect(wrapper.find('textarea').classes()).toContain('ring-red-500')
    })

    it('marks anonName invalid for unauthenticated submit without a name', async () => {
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Great comment')
      await submitBtn(wrapper).trigger('click')
      await nextTick()
      expect(vi.mocked((globalThis as any).$api)).not.toHaveBeenCalled()
      expect(wrapper.find('input[placeholder*="Your name"]').classes()).toContain('ring-red-500')
    })
  })

  describe('submission', () => {
    it('submits without anonName when authenticated', async () => {
      vi.mocked((globalThis as any).$api).mockResolvedValue({})
      const auth = useAuthStore()
      auth.setSession('tok', { id: '1', username: 'u', email: 'u@x.com' })
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Nice work')
      await submitBtn(wrapper).trigger('click')
      await flushPromises()
      const [path, opts] = vi.mocked((globalThis as any).$api).mock.calls[0]
      const payload = JSON.parse((opts as any).body)
      expect(path).toBe('/assets/asset-1/comments')
      expect(payload.body).toBe('Nice work')
      expect(payload.versionId).toBe('version-1')
      expect(payload).not.toHaveProperty('anonName')
    })

    it('submits with anonName when not authenticated', async () => {
      vi.mocked((globalThis as any).$api).mockResolvedValue({})
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Hello')
      await wrapper.find('input[placeholder*="Your name"]').setValue('Alice')
      await submitBtn(wrapper).trigger('click')
      await flushPromises()
      const [, opts] = vi.mocked((globalThis as any).$api).mock.calls[0]
      const payload = JSON.parse((opts as any).body)
      expect(payload.anonName).toBe('Alice')
    })

    it('emits submitted on successful API call without nudge', async () => {
      vi.mocked((globalThis as any).$api).mockResolvedValue({})
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Hi')
      await wrapper.find('input[placeholder*="Your name"]').setValue('Bob')
      await submitBtn(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.emitted('submitted')).toBeTruthy()
    })

    it('shows nudge state when API returns nudge and localStorage flag is not set', async () => {
      vi.mocked((globalThis as any).$api).mockResolvedValue({
        nudge: { message: 'Create an account!', signupUrl: '/register' },
      })
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Hi')
      await wrapper.find('input[placeholder*="Your name"]').setValue('Bob')
      await submitBtn(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.emitted('submitted')).toBeFalsy()
      expect(wrapper.text()).toContain('Comment posted!')
    })

    it('dismissNudge sets localStorage flag and emits submitted', async () => {
      vi.mocked((globalThis as any).$api).mockResolvedValue({
        nudge: { message: 'Create an account!', signupUrl: '/register' },
      })
      const wrapper = mountCompose()
      await wrapper.find('textarea').setValue('Hi')
      await wrapper.find('input[placeholder*="Your name"]').setValue('Bob')
      await submitBtn(wrapper).trigger('click')
      await flushPromises()
      // Click "Maybe later" to dismiss nudge
      const maybeBtn = wrapper.findAll('button').find(b => b.text() === 'Maybe later')!
      await maybeBtn.trigger('click')
      await nextTick()
      expect(localStorage.getItem('filemcp_nudge_dismissed')).toBe('1')
      expect(wrapper.emitted('submitted')).toBeTruthy()
    })
  })

  it('cancel button emits cancel', async () => {
    const wrapper = mountCompose()
    await cancelBtn(wrapper).trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
