# API Specification — filemcp

Base URL: `https://filemcp.com/api`

All responses are JSON. Errors follow the shape:
```json
{ "statusCode": 400, "error": "Bad Request", "message": "..." }
```

Auth:
- **Web session**: `Authorization: Bearer <jwt>`
- **CLI/API key**: `Authorization: Bearer filemcp_<key>`

---

## Auth

### POST /auth/register
Create a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "dexter",
  "password": "min8chars"
}
```

**Response 201:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "username": "dexter", "email": "user@example.com" }
}
```

---

### POST /auth/login
**Body:**
```json
{ "email": "user@example.com", "password": "..." }
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "username": "dexter" }
}
```
Refresh token set as `Set-Cookie: refresh_token=...; HttpOnly; SameSite=Strict`

---

### POST /auth/refresh
Exchange refresh token (from cookie) for new access token.

**Response 200:**
```json
{ "accessToken": "eyJ..." }
```

---

### POST /auth/logout
Revokes the refresh token.
**Response 204**: no body

---

## API Keys

### GET /keys
List all API keys for the authenticated user.

**Auth required**: JWT

**Response 200:**
```json
[
  {
    "id": "key_abc",
    "name": "my-cli-key",
    "lastFourChars": "x7z2",
    "lastUsedAt": "2026-04-20T10:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "revokedAt": null
  }
]
```

---

### POST /keys
Create a new API key.

**Auth required**: JWT

**Body:**
```json
{ "name": "my-cli-key" }
```

**Response 201:**
```json
{
  "id": "key_abc",
  "name": "my-cli-key",
  "key": "filemcp_a1b2c3d4e5f6...",
  "lastFourChars": "x7z2"
}
```
`key` is shown **only in this response**. Not stored in plaintext.

---

### DELETE /keys/:id
Revoke an API key.

**Auth required**: JWT, must own the key

**Response 204**: no body

---

## Assets

### POST /assets
Upload a new asset or a new version of an existing asset.

**Auth required**: JWT or API key

**Content-Type**: `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | yes | The asset file |
| `slug` | string | no | URL slug. Auto-generated if omitted. Must match `[a-z0-9-]+` |
| `description` | string | no | Version description |
| `visibility` | enum | no | `PUBLIC` (default), `UNLISTED`, `PRIVATE` |

**Behavior:**
- If `slug` doesn't exist for this user → creates new asset + version 1
- If `slug` already exists → creates new version (incremented number)

**Response 201:**
```json
{
  "assetId": "asset_xyz",
  "slug": "q3-review",
  "version": 1,
  "url": "https://filemcp.com/u/dexter/q3-review",
  "versionUrl": "https://filemcp.com/u/dexter/q3-review/v/1",
  "fileType": "HTML",
  "sizeBytes": 42000
}
```

---

### GET /assets
List assets owned by the authenticated user.

**Auth required**: JWT

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `visibility` — filter by visibility

**Response 200:**
```json
{
  "items": [
    {
      "id": "asset_xyz",
      "slug": "q3-review",
      "title": "q3-review",
      "visibility": "PUBLIC",
      "latestVersion": 3,
      "commentCount": 7,
      "thumbnailUrl": "https://...",
      "createdAt": "2026-04-01T00:00:00Z",
      "updatedAt": "2026-04-20T00:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET /assets/:id
Get asset metadata by ID.

**Auth required**: JWT (for private assets) or none (for public/unlisted)

**Response 200:**
```json
{
  "id": "asset_xyz",
  "slug": "q3-review",
  "title": "q3-review",
  "visibility": "PUBLIC",
  "owner": { "username": "dexter" },
  "versions": [
    { "number": 1, "createdAt": "...", "sizeBytes": 42000 },
    { "number": 2, "createdAt": "...", "sizeBytes": 43500 }
  ],
  "commentCount": 7
}
```

---

### PATCH /assets/:id
Update asset metadata.

**Auth required**: JWT, must be owner

**Body (all optional):**
```json
{
  "title": "Q3 Review Deck",
  "visibility": "UNLISTED"
}
```

**Response 200:** updated asset object

---

### DELETE /assets/:id
Delete an asset and all its versions.

**Auth required**: JWT, must be owner

**Response 204**: no body

---

## Versions

### GET /assets/:assetId/versions
List all versions of an asset.

**Response 200:**
```json
[
  {
    "id": "ver_1",
    "number": 1,
    "fileType": "HTML",
    "sizeBytes": 42000,
    "description": "initial draft",
    "thumbnailUrl": "https://...",
    "createdAt": "2026-04-01T00:00:00Z"
  }
]
```

---

### GET /assets/:assetId/versions/:version/content
Get the raw content URL for a specific version. Returns a presigned S3 URL.

**Response 200:**
```json
{
  "url": "https://r2.filemcp.com/assets/.../original.html?X-Amz-Signature=...",
  "expiresAt": "2026-04-21T12:00:00Z",
  "fileType": "HTML"
}
```

---

## Public Asset Resolution

These routes power the viewer pages.

### GET /public/:username/:slug
Resolve the latest version of an asset by username + slug.

**Auth optional** (enriches response if authed — e.g. "is this yours?")

**Response 200:**
```json
{
  "assetId": "asset_xyz",
  "slug": "q3-review",
  "title": "Q3 Review Deck",
  "owner": { "username": "dexter" },
  "latestVersion": 3,
  "currentVersion": {
    "number": 3,
    "fileType": "HTML",
    "contentUrl": "https://...",
    "thumbnailUrl": "https://..."
  },
  "commentCount": 7,
  "visibility": "PUBLIC",
  "isOwner": false
}
```

---

### GET /public/:username/:slug/v/:version
Same as above but for a specific version number.

---

## Comments

### GET /assets/:assetId/comments
Get all comments for an asset.

**Auth optional**

**Query params:**
- `resolved` — `true` / `false` / omit for all

**Response 200:**
```json
[
  {
    "id": "cmt_1",
    "body": "This slide is unclear",
    "anchorType": "POSITION",
    "xPct": 0.32,
    "yPct": 0.55,
    "selectorHint": "body > section:nth-child(3) > h2",
    "resolved": false,
    "author": { "username": "alice" },
    "createdAt": "2026-04-20T09:00:00Z",
    "replies": [
      {
        "id": "cmt_2",
        "body": "Agreed, will revise",
        "author": { "username": "dexter" },
        "createdAt": "2026-04-20T09:30:00Z"
      }
    ]
  }
]
```

---

### POST /assets/:assetId/comments
Post a new comment.

**Auth**: JWT if logged in, or anonymous (no auth header). Anonymous commenters must supply `anonName`.

**Body:**
```json
{
  "body": "This slide is unclear",
  "anchorType": "POSITION",
  "xPct": 0.32,
  "yPct": 0.55,
  "selectorHint": "body > section:nth-child(3) > h2",
  "anonName": "Alice",        // required if not authenticated
  "anonEmail": "a@example.com" // optional; pre-fills signup form
}
```

Or for line-range anchoring:
```json
{
  "body": "Should we add a summary here?",
  "anchorType": "LINE_RANGE",
  "lineStart": 14,
  "lineEnd": 18,
  "anonName": "Bob"
}
```

Or a reply:
```json
{
  "body": "Good point",
  "parentId": "cmt_1",
  "anonName": "Alice"
}
```
When `parentId` is set, anchor fields are ignored (reply inherits parent anchor).

**Post-comment response includes a `nudge` field for anonymous commenters:**
```json
{
  "comment": { ...comment object... },
  "nudge": {
    "message": "Save your comments and get notified on replies.",
    "signupUrl": "/register?prefill_email=a%40example.com"
  }
}
```
`nudge` is omitted if the commenter is authenticated.

**Response 201:** the created comment object

---

### PATCH /comments/:id
Edit a comment body or resolve/unresolve it.

**Auth required**: JWT
- Body edit: must be comment author
- Resolve/unresolve: must be comment author or asset owner

**Body (all optional):**
```json
{
  "body": "Updated text",
  "resolved": true
}
```

**Response 200:** updated comment object

---

### DELETE /comments/:id
Delete a comment.

**Auth required**: JWT, must be comment author or asset owner

**Response 204**: no body

---

## Users

### GET /users/:username
Public profile.

**Response 200:**
```json
{
  "username": "dexter",
  "assetCount": 12,
  "joinedAt": "2026-01-01T00:00:00Z"
}
```

---

### GET /users/me
Authenticated user's own profile.

**Auth required**: JWT

**Response 200:**
```json
{
  "id": "usr_abc",
  "username": "dexter",
  "email": "dexter@example.com",
  "assetCount": 12,
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

## Error Reference

| Status | When |
|--------|------|
| 400 | Validation failure, bad file type, slug taken |
| 401 | Missing or invalid auth token/key |
| 403 | Authenticated but not authorized (not owner) |
| 404 | Asset not found or private asset (to prevent enumeration) |
| 409 | Username or email already taken |
| 413 | File too large (> 10MB) |
| 429 | Rate limit exceeded |
| 422 | Unsupported file type |
