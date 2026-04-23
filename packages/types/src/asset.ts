export type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE'

export type FileType = 'HTML' | 'MARKDOWN' | 'JSON' | 'TEXT' | 'CSS' | 'JS' | 'TS' | 'SVG'

export interface AssetSummary {
  id: string
  slug: string
  title: string | null
  visibility: Visibility
  latestVersion: number
  commentCount: number
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
  owner: { username: string }
}

export interface AssetUploadResponse {
  assetId: string
  slug: string
  version: number
  url: string
  versionUrl: string
  fileType: FileType
  sizeBytes: number
}
