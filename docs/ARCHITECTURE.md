# Architecture — filemcp

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Clients                                                  │
│  curl / API key  │  Nuxt Web App  │  MCP Server (v1.5)   │
└────────┬─────────────────┬──────────────────┬────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│  NestJS API  (Fastify adapter)                           │
│                                                          │
│  Modules:                                                │
│  auth │ users │ assets │ versions │ comments │ storage   │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────┐
   │ PostgreSQL  │  │  S3-compat   │  │  BullMQ  │
   │ (Prisma)   │  │  (file store)│  │  (jobs)  │
   └─────────────┘  └──────────────┘  └────┬─────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Workers    │
                                    │ md→html     │
                                    │ thumbnail   │
                                    └─────────────┘
```

---

## Backend — NestJS

### Module Structure

```
apps/api/src/
├── main.ts
├── app.module.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── api-key.strategy.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       ├── api-key.guard.ts
│   │       └── optional-auth.guard.ts  # for public routes that enrich with user context if present
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── users.controller.ts
│   ├── assets/
│   │   ├── assets.module.ts
│   │   ├── assets.service.ts
│   │   ├── assets.controller.ts
│   │   └── dto/
│   │       ├── create-asset.dto.ts
│   │       └── asset-response.dto.ts
│   ├── versions/
│   │   ├── versions.module.ts
│   │   ├── versions.service.ts
│   │   └── versions.controller.ts
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.service.ts
│   │   ├── comments.controller.ts
│   │   └── dto/
│   │       ├── create-comment.dto.ts
│   │       └── comment-response.dto.ts
│   └── storage/
│       ├── storage.module.ts
│       └── storage.service.ts          # wraps S3 SDK
├── workers/
│   ├── render.worker.ts                # markdown → HTML conversion
│   └── thumbnail.worker.ts            # generate preview screenshot
├── prisma/
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── schema.prisma
└── config/
    ├── config.module.ts
    └── config.service.ts
```

---

## Database Schema (Prisma)

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  username     String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  assets       Asset[]
  apiKeys      ApiKey[]
  comments     Comment[]
}

model ApiKey {
  id          String    @id @default(cuid())
  name        String
  keyHash     String    @unique   // bcrypt hash of the actual key
  lastFourChars String            // for display only
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  userId      String
  user        User      @relation(fields: [userId], references: [id])
}

model Asset {
  id           String     @id @default(cuid())
  slug         String
  title        String?    // defaults to filename
  visibility   Visibility @default(PUBLIC)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  ownerId      String
  owner        User       @relation(fields: [ownerId], references: [id])
  versions     Version[]
  comments     Comment[]

  @@unique([ownerId, slug])
}

model Version {
  id           String   @id @default(cuid())
  number       Int                           // 1-indexed, monotonically increasing per asset
  fileType     FileType
  storagePath  String                        // S3 key
  sizeBytes    Int
  description  String?
  renderedPath String?                       // S3 key for server-rendered HTML (md assets)
  thumbnailPath String?
  createdAt    DateTime @default(now())

  assetId      String
  asset        Asset    @relation(fields: [assetId], references: [id])

  @@unique([assetId, number])
}

model Comment {
  id           String        @id @default(cuid())
  body         String
  anchorType   AnchorType
  // HTML anchor
  xPct         Float?        // 0-1, percentage of rendered width
  yPct         Float?        // 0-1, percentage of rendered height
  selectorHint String?       // best-effort DOM path
  // Text/MD anchor
  lineStart    Int?
  lineEnd      Int?
  resolved     Boolean       @default(false)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  assetId      String
  asset        Asset         @relation(fields: [assetId], references: [id])
  authorId     String?       // null = anonymous comment
  author       User?         @relation(fields: [authorId], references: [id])
  anonName     String?       // display name for anonymous commenters (required when authorId null)
  anonEmail    String?       // optional; pre-fills signup form if provided
  parentId     String?       // null = top-level
  parent       Comment?      @relation("replies", fields: [parentId], references: [id])
  replies      Comment[]     @relation("replies")
}

enum Visibility {
  PUBLIC
  UNLISTED
  PRIVATE
}

enum FileType {
  HTML
  MARKDOWN
  JSON
  TEXT
  CSS
  JS
  TS
  SVG
}

enum AnchorType {
  POSITION   // x/y for HTML
  LINE_RANGE // line numbers for text/MD
}
```

---

## Frontend — Nuxt 3

```
apps/web/
├── pages/
│   ├── index.vue                 # landing page
│   ├── login.vue
│   ├── register.vue
│   ├── dashboard/
│   │   ├── index.vue             # /dashboard — my assets
│   │   ├── shared.vue            # /dashboard/shared
│   │   └── keys.vue              # /dashboard/keys
│   └── u/
│       └── [username]/
│           └── [slug]/
│               ├── index.vue     # /u/:username/:slug — latest version
│               └── v/
│                   └── [version].vue  # /u/:username/:slug/v/:version
├── components/
│   ├── asset/
│   │   ├── AssetViewer.vue       # orchestrates render + comment overlay
│   │   ├── HtmlRenderer.vue      # sandboxed iframe
│   │   ├── MarkdownRenderer.vue
│   │   ├── JsonRenderer.vue
│   │   └── CodeRenderer.vue
│   ├── comment/
│   │   ├── CommentPin.vue        # numbered pin overlay
│   │   ├── CommentPanel.vue      # side panel
│   │   ├── CommentThread.vue
│   │   └── CommentCompose.vue
│   ├── dashboard/
│   │   ├── AssetGrid.vue
│   │   ├── AssetCard.vue
│   │   └── VersionBadge.vue
│   └── ui/                       # shadcn-vue components
├── composables/
│   ├── useApi.ts                 # typed $fetch wrapper
│   ├── useAuth.ts
│   ├── useAsset.ts
│   └── useComments.ts
├── stores/
│   ├── auth.store.ts
│   └── comment.store.ts
└── middleware/
    ├── auth.ts                   # redirect to /login if no session
    └── guest.ts                  # redirect to /dashboard if already authed
```

### Rendering Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| `/u/:username/:slug` | SSR | OG meta tags, SEO, fast first paint for shared links |
| `/dashboard/*` | SPA (CSR) | Auth-gated, no SEO needed, snappy navigation |
| `/` (landing) | SSG | Static, no dynamic data |

---

## Auth Flow

### Web (JWT)
1. POST `/api/auth/login` → returns `{ accessToken, refreshToken }`
2. Access token stored in memory (Pinia), refresh token in httpOnly cookie
3. Access token expires in 15min, refresh in 7 days
4. Nuxt middleware calls `/api/auth/refresh` on load if access token absent

### CLI / curl (API Key)
1. User creates a named API key in dashboard
2. Key is shown once — format: `filemcp_<32 random chars>`
3. Sent as `Authorization: Bearer <key>` header
4. Backend identifies `filemcp_` prefix and routes to `ApiKeyGuard` instead of `JwtGuard`
5. Key is hashed (bcrypt) before storage; plaintext never stored

---

## Storage

### File Storage (S3-compatible)
- Local dev: MinIO via Docker
- Production: AWS S3 or Cloudflare R2 (R2 preferred — no egress fees)
- Bucket structure:
  ```
  assets/
    {userId}/
      {assetId}/
        v{version}/
          original.{ext}         # raw uploaded file
          rendered.html          # only for .md files, server-side render output
          thumbnail.webp         # auto-generated preview
  ```
- Presigned URLs for direct asset delivery (no proxying through API server)
- Thumbnail generation queued via BullMQ after upload

### Database
- PostgreSQL via managed service (Supabase or Railway for dev, RDS for prod)
- Prisma migrations versioned in repo

---

## Job Queue (BullMQ)

### `render` queue
- Triggered: when a `.md` file is uploaded
- Job: render Markdown → HTML using `unified` + `remark` + `rehype` pipeline
- Output: store rendered HTML to S3 at `rendered.html`, update `Version.renderedPath`

### `thumbnail` queue
- Triggered: after every upload
- Job: use Playwright headless to screenshot the rendered asset
- Output: store as `thumbnail.webp`, update `Version.thumbnailPath`
- Fallback: if Playwright job fails, use a text-based placeholder thumbnail

---

## Security Considerations

- HTML assets rendered in a **sandboxed iframe** with `sandbox="allow-scripts"` — no `allow-same-origin` to prevent XSS escaping the frame
- API keys hashed with bcrypt before storage
- File uploads: MIME type validated server-side (not just extension), content scanned for script injection in non-HTML types
- Rate limiting on upload endpoints (100/day per API key, 10/minute burst)
- Public asset routes: no auth leak — visibility check returns 404 (not 403) for private assets to prevent enumeration
- CORS: `api.filemcp.com` only accepts origins from `filemcp.com` for credentialed requests

---

## Infrastructure (target production)

```
cloudflare (DNS + WAF)
     │
     ▼
Nuxt 3 app  ──── deployed on Vercel or Cloudflare Pages
     │
     ▼
NestJS API  ──── deployed on Railway or Fly.io (containerized)
     │
     ├──── PostgreSQL (Supabase or Railway)
     ├──── Redis (BullMQ) — Upstash Redis
     └──── Cloudflare R2 (file storage)
```

Local dev uses Docker Compose for PostgreSQL, Redis, and MinIO.
