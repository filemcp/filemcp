export type AnchorType = 'POSITION' | 'LINE_RANGE'

export interface CommentAuthor {
  username: string
}

export interface Comment {
  id: string
  body: string
  anchorType: AnchorType
  xPct: number | null
  yPct: number | null
  selectorHint: string | null
  lineStart: number | null
  lineEnd: number | null
  resolved: boolean
  author: CommentAuthor | null
  anonName: string | null
  versionId: string
  versionNumber: number | null
  createdAt: string
  updatedAt: string
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  body: string
  author: CommentAuthor | null
  anonName: string | null
  versionId: string
  versionNumber: number | null
  createdAt: string
}

export interface CreateCommentPayload {
  body: string
  versionId?: string
  anchorType?: AnchorType
  xPct?: number
  yPct?: number
  selectorHint?: string
  lineStart?: number
  lineEnd?: number
  parentId?: string
  anonName?: string
  anonEmail?: string
}

export interface CommentNudge {
  message: string
  signupUrl: string
}

export interface CreateCommentResponse {
  comment: Comment
  nudge?: CommentNudge
}
