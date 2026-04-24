# API Specification — filemcp

Base URL: `https://api.filemcp.com/api`

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
Create a new account. Automatically creates a personal org (slug = username) with the user as OWNER.

**Body:**
```json
{
  "email": "user@example.com",
  "username": "dexter",
  "password": "min8chars",
  "orgName": "My Workspace"   // optional, defaults to username
}
```

**Response 201:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "username": "dexter", "email": "user@example.com", "createdAt": "..." }
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
  "user": { "id": "...", "username": "dexter", "email": "user@example.com", "createdAt": "..." }
}
```

---

## Users

### GET /users/me
Authenticated user's profile, including all org memberships.

**Auth required**: JWT

**Response 200:**
```json
{
  "id": "usr_abc",
  "username": "dexter",
  "email": "dexter@example.com",
  "orgs": [
    { "slug": "dexter", "name": "dexter", "role": "OWNER" },
    { "slug": "acme", "name": "Acme Corp", "role": "WRITE" }
  ],
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

### GET /users/:username
Public profile.

**Response 200:**
```json
{
  "username": "dexter",
  "orgCount": 2,
  "joinedAt": "2026-01-01T00:00:00Z"
}
```

---

## Organizations

### POST /orgs
Create a new org.

**Auth required**: JWT

**Body:**
```json
{ "slug": "acme", "name": "Acme Corp", "description": "optional" }
```

**Response 201:** org object

---

### GET /orgs
List orgs the authenticated user is a member of.

**Auth required**: JWT

---

### GET /orgs/:slug
Get org detail.

**Auth required**: JWT, must be a member

---

### POST /orgs/:slug/members
Invite a member by username.

**Auth required**: JWT, OWNER role

**Body:**
```json
{ "username": "alice", "role": "WRITE" }
```

---

### PATCH /orgs/:slug/members/:userId
Update a member's role.

**Auth required**: JWT, OWNER role

**Body:**
```json
{ "role": "READ" }
```

---

### DELETE /orgs/:slug/members/:userId
Remove a member from the org.

**Auth required**: JWT, OWNER role

**Response 204**: no body

---

## API Keys

Keys are scoped to an org membership. An API key authenticates as the member in that org with that member's role.

### POST /orgs/:slug/keys
Create a new API key for the given org.

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

### GET /orgs/:slug/keys
List API keys for the given org.

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

### DELETE /orgs/:slug/keys/:keyId
Revoke an API key.

**Auth required**: JWT

**Response 204**: no body

---

## Assets

Assets are scoped to an org. The URL slug is unique within an org. Each asset also has a stable `uuid` used in public viewer URLs.

### POST /orgs/:slug/assets
Upload a new asset or a new version of an existing asset.

**Auth required**: JWT or API key (WRITE or OWNER role)

**Content-Type**: `multipart/form-data`

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | yes | The asset file |
| `slug` | string | no | URL slug. Auto-generated if omitted. |
| `description` | string | no | Version description |
| `visibility` | enum | no | `PUBLIC` (default), `UNLISTED`, `PRIVATE` |

**Behavior:**
- If `slug` doesn't exist → creates new asset + version 1
- If `slug` already exists → creates new version

**Response 201:**
```json
{
  "assetId": "asset_xyz",
  "slug": "q3-review",
  "uuid": "c58267ac-514f-48bf-886c-ca4295a3cd38",
  "version": 1,
  "url": "https://filemcp.com/u/dexter/c58267ac-514f-48bf-886c-ca4295a3cd38",
  "versionUrl": "https://filemcp.com/u/dexter/c58267ac-514f-48bf-886c-ca4295a3cd38/v/1",
  "fileType": "HTML",
  "sizeBytes": 42000
}
```

---

### GET /orgs/:slug/assets
List assets in the org.

**Auth required**: JWT or API key

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response 200:**
```json
{
  "items": [
    {
      "id": "asset_xyz",
      "uuid": "c58267ac-...",
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

### GET /orgs/:slug/assets/:id
Get asset metadata by ID.

**Auth required**: JWT or API key

---

### PATCH /orgs/:slug/assets/:id
Update asset metadata.

**Auth required**: JWT or API key (OWNER role)

**Body (all optional):**
```json
{ "title": "Q3 Review Deck", "visibility": "UNLISTED" }
```

---

### DELETE /orgs/:slug/assets/:id
Delete an asset and all its versions.

**Auth required**: JWT or API key (OWNER role)

**Response 204**: no body

---

## Public Asset Resolution

These routes power the viewer pages. The asset is identified by `org slug` + `uuid` (not username + slug) to keep URLs stable if a slug is renamed.

### GET /public/:org/:uuid
Resolve the latest version of an asset.

**Auth optional**

**Response 200:**
```json
{
  "assetId": "asset_xyz",
  "slug": "q3-review",
  "uuid": "c58267ac-...",
  "title": "Q3 Review Deck",
  "owner": { "org": "dexter" },
  "latestVersion": 3,
  "currentVersion": {
    "number": 3,
    "fileType": "HTML",
    "thumbnailUrl": "https://..."
  },
  "commentCount": 7,
  "visibility": "PUBLIC"
}
```

---

### GET /public/:org/:uuid/v/:version
Same as above but for a specific version number.

---

### GET /public/:org/:uuid/content
Stream the raw asset content (latest version).

**Response**: raw file bytes with appropriate `Content-Type`

---

### GET /public/:org/:uuid/v/:version/content
Stream raw content for a specific version.

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
Post a new comment. Anonymous commenters must supply `anonName`.

**Body:**
```json
{
  "body": "This slide is unclear",
  "anchorType": "POSITION",
  "xPct": 0.32,
  "yPct": 0.55,
  "selectorHint": "body > section:nth-child(3) > h2",
  "anonName": "Alice",
  "anonEmail": "a@example.com"
}
```

Line-range anchor:
```json
{
  "body": "Should we add a summary?",
  "anchorType": "LINE_RANGE",
  "lineStart": 14,
  "lineEnd": 18,
  "anonName": "Bob"
}
```

Reply:
```json
{ "body": "Good point", "parentId": "cmt_1", "anonName": "Alice" }
```

**Response 201:** the created comment object

---

### PATCH /comments/:id
Edit body or resolve/unresolve.

**Auth required**: JWT

**Body (all optional):**
```json
{ "body": "Updated text", "resolved": true }
```

---

### DELETE /comments/:id
**Auth required**: JWT (comment author or asset org OWNER)

**Response 204**: no body

---

## MCP Server

The MCP server is mounted at `POST /mcp` (JSON-RPC 2.0). Auth via API key only.

### Tools

**`upload_asset`** — Returns a `curl` command to run. The command uploads the file and returns `{ url, versionUrl }`.

Input:
```json
{ "filepath": "/path/to/file.html", "filename": "deck.html" }
```

**`list_assets`** — Lists uploaded assets for the authenticated org.

Input:
```json
{ "page": 1, "limit": 20 }
```

**`get_asset`** — Returns the raw content of an asset.

Input:
```json
{ "slug": "my-deck", "version": 2 }
```

---

## Error Reference

| Status | When |
|--------|------|
| 400 | Validation failure, bad file type |
| 401 | Missing or invalid auth token/key |
| 403 | Authenticated but not authorized |
| 404 | Asset not found or private (to prevent enumeration) |
| 409 | Username, email, or org slug already taken |
| 413 | File too large |
| 422 | Unsupported file type |
| 429 | Rate limit exceeded |
