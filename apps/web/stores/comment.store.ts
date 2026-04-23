import { defineStore } from 'pinia'
import type { Comment } from '@cdnmcp/types'

interface CommentState {
  comments: Comment[]
  commentMode: boolean
  pendingAnchor: { xPct: number; yPct: number; selectorHint: string } | null
  activeCommentId: string | null
}

export const useCommentStore = defineStore('comments', {
  state: (): CommentState => ({
    comments: [],
    commentMode: false,
    pendingAnchor: null,
    activeCommentId: null,
  }),

  actions: {
    setComments(comments: Comment[]) {
      this.comments = comments
    },

    addComment(comment: Comment) {
      this.comments.push(comment)
    },

    toggleCommentMode() {
      this.commentMode = !this.commentMode
      if (!this.commentMode) this.pendingAnchor = null
    },

    setPendingAnchor(anchor: CommentState['pendingAnchor']) {
      this.pendingAnchor = anchor
    },

    setActiveComment(id: string | null) {
      this.activeCommentId = id
    },
  },
})
