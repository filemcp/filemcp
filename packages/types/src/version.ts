import type { FileType } from './asset'

export interface VersionSummary {
  id: string
  number: number
  fileType: FileType
  sizeBytes: number
  description: string | null
  thumbnailUrl: string | null
  createdAt: string
}

export interface VersionContent {
  url: string
  expiresAt: string
  fileType: FileType
}
