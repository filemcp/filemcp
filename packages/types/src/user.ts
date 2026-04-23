export interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

export interface PublicUser {
  username: string
  assetCount: number
  joinedAt: string
}

export interface ApiKey {
  id: string
  name: string
  lastFourChars: string
  lastUsedAt: string | null
  createdAt: string
  revokedAt: string | null
}
