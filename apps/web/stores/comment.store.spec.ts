import { describe, it, expect, beforeEach } from 'vitest'
import { useCommentStore } from './comment.store'
import type { Comment } from '@filemcp/types'

const makeComment = (overrides?: Partial<Comment>): Comment => ({
  id: 'c1',
  assetId: 'a1',
  body: 'hello',
  anchorType: 'POSITION' as any,
  xPct: 0.5,
  yPct: 0.5,
  selectorHint: '',
  resolved: false,
  anonName: null,
  anonEmail: null,
  authorId: null,
  parentId: null,
  createdAt: new Date().toISOString() as any,
  updatedAt: new Date().toISOString() as any,
  ...overrides,
})

describe('useCommentStore', () => {
  let store: ReturnType<typeof useCommentStore>

  beforeEach(() => {
    store = useCommentStore()
  })

  describe('setComments', () => {
    it('replaces the comments list', () => {
      store.setComments([makeComment({ id: 'c1' }), makeComment({ id: 'c2' })])
      expect(store.comments).toHaveLength(2)
      store.setComments([makeComment({ id: 'c3' })])
      expect(store.comments).toHaveLength(1)
      expect(store.comments[0].id).toBe('c3')
    })
  })

  describe('addComment', () => {
    it('appends a comment to the list', () => {
      store.setComments([makeComment({ id: 'c1' })])
      store.addComment(makeComment({ id: 'c2' }))
      expect(store.comments).toHaveLength(2)
    })
  })

  describe('toggleCommentMode', () => {
    it('flips commentMode', () => {
      expect(store.commentMode).toBe(false)
      store.toggleCommentMode()
      expect(store.commentMode).toBe(true)
      store.toggleCommentMode()
      expect(store.commentMode).toBe(false)
    })

    it('clears pendingAnchor when turning off', () => {
      store.setPendingAnchor({ xPct: 0.5, yPct: 0.5, selectorHint: '' })
      store.toggleCommentMode() // on
      store.toggleCommentMode() // off
      expect(store.pendingAnchor).toBeNull()
    })
  })

  describe('setPendingAnchor', () => {
    it('sets the pending anchor', () => {
      const anchor = { xPct: 0.3, yPct: 0.7, selectorHint: 'div > p' }
      store.setPendingAnchor(anchor)
      expect(store.pendingAnchor).toEqual(anchor)
    })

    it('can clear the anchor with null', () => {
      store.setPendingAnchor({ xPct: 0.5, yPct: 0.5, selectorHint: '' })
      store.setPendingAnchor(null)
      expect(store.pendingAnchor).toBeNull()
    })
  })

  describe('setActiveComment', () => {
    it('sets the active comment id', () => {
      store.setActiveComment('c42')
      expect(store.activeCommentId).toBe('c42')
    })

    it('can clear with null', () => {
      store.setActiveComment('c42')
      store.setActiveComment(null)
      expect(store.activeCommentId).toBeNull()
    })
  })
})
