# Architecture — filemcp

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Clients                                                  │
│  curl / API key  │  Nuxt Web App  │  MCP Server          │
└────────┬─────────────────┬──────────────────┬────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│  NestJS API  (Fastify adapter)                           │
│                                                          │
│  Modules:                                                │
│  auth │ users │ orgs │ assets │ versions │ comments      │
│  storage │ render │ thumbnail │ mcp                      │
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
                                    │  Worker     │
                                    │ (separate   │
                                    │  app)       │
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
├── utils/
│   └── slug.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.service.ts
    │   ├── auth.controller.ts
    │   ├── strategies/
    │   │   ├── jwt.strategy.ts
    │   │   └── api-key.strategy.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── api-key.guard.ts
    │   │   └── optional-auth.guard.ts
    │   └── decorators/
    │       └── require-org-role.decorator.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.service.ts
    │   └── users.controller.ts
    ├── orgs/
    │   ├── orgs.module.ts
    │   ├── orgs.service.ts
    │   └── orgs.controller.ts
    ├── assets/
    │   ├── assets.module.ts
    │   ├── assets.service.ts
    │   ├── assets.controller.ts     # /orgs/:slug/assets
    │   ├── public.controller.ts     # /public/:org/:uuid
    │   └── dto/
    ├── comments/
    │   ├── comments.module.ts
    │   ├── comments.service.ts
    │   └── comments.controller.ts
    ├── storage/
    │   ├── storage.module.ts
    │   └── storage.service.ts
    ├── render/
    │   ├── render.module.ts
    │   └── render.service.ts        # markdown → HTML via unified
    ├── thumbnail/
    │   ├── thumbnail.module.ts
    │   └── thumbnail.service.ts     # enqueues BullMQ jobs
    └── mcp/
        ├── mcp.module.ts
        ├── mcp.controller.ts
        └── mcp.service.ts
```

### Worker App

Thumbnail generation runs as a separate process in `apps/worker/` — a standalone Node app (not part of NestJS) that consumes the `screenshots` BullMQ queue using Playwright headless to screenshot assets and upload thumbnails to S3.

```
apps/worker/src/
└── index.ts    # BullMQ worker, Playwright, S3 upload
```

---

## Database Schema (Prisma)

```prisma
model Organization {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())

  members OrgMember[]
  assets  Asset[]
}

model OrgMember {
  id        String   @id @default(cuid())
  role      OrgRole
  createdAt DateTime @default(now())

  orgId   String
  org     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  userId  String
  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKeys ApiKey[]

  @@unique([orgId, userId])
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships OrgMember[]
  comments    Comment[]
}

model ApiKey {
  id            String    @id @default(cuid())
  name          String
  keyHash       String    @unique
  keyPrefix     String
  lastFourChars String
  lastUsedAt    DateTime?
  createdAt     DateTime  @default(now())
  revokedAt     DateTime?

  memberId String
  member   OrgMember @relation(fields: [memberId], references: [id], onDelete: Cascade)

  @@index([keyPrefix])
}

model Asset {
  id         String     @id @default(cuid())
  uuid       String     @unique @default(uuid())
  slug       String
  title      String?
  visibility Visibility @default(PUBLIC)
  viewCount  Int        @default(0)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  orgId    String
  org      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  versions Version[]
  comments Comment[]

  @@unique([orgId, slug])
}

model Version {
  id            String   @id @default(cuid())
  number        Int
  fileType      FileType
  storagePath   String
  sizeBytes     Int
  description   String?
  renderedPath  String?
  thumbnailPath String?
  createdAt     DateTime @default(now())

  assetId  String
  asset    Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  comments Comment[]

  @@unique([assetId, number])
}

model Comment {
  id           String     @id @default(cuid())
  body         String
  anchorType   AnchorType
  xPct         Float?
  yPct         Float?
  selectorHint String?
  lineStart    Int?
  lineEnd      Int?
  resolved     Boolean    @default(false)
  anonName     String?
  anonEmail    String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  assetId   String
  asset     Asset    @relation(fields: [assetId], references: [id], onDelete: Cascade)
  versionId String
  version   Version  @relation(fields: [versionId], references: [id], onDelete: Cascade)
  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)
  parentId  String?
  parent    Comment? @relation("replies", fields: [parentId], references: [id])
  replies   Comment[] @relation("replies")

  @@index([versionId])
}

enum OrgRole   { OWNER WRITE READ }
enum Visibility { PUBLIC UNLISTED PRIVATE }
enum FileType  { HTML MARKDOWN JSON TEXT CSS JS TS SVG }
enum AnchorType { POSITION LINE_RANGE }
```

---

## Frontend — Nuxt 3

```
apps/web/
├── pages/
│   ├── index.vue
│   ├── login.vue
│   ├── register.vue
│   ├── dashboard/
│   │   ├── index.vue        # /dashboard — my assets
│   │   ├── members.vue      # /dashboard/members
│   │   └── keys.vue         # /dashboard/keys
│   └── u/
│       └── [username]/
│           └── [slug]/
│               ├── index.vue
│               └── v/
│                   └── [version].vue
├── components/
│   ├── DashboardNav.vue
│   └── ...
├── composables/
│   ├── useApi.ts            # typed $fetch wrapper + $api helper
│   └── ...
├── stores/
│   └── auth.store.ts
└── middleware/
    ├── auth.ts
    └── guest.ts
```

### Rendering Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| `/u/:username/:slug` | SSR | OG meta tags, SEO, fast first paint for shared links |
| `/dashboard/*` | SPA (CSR) | Auth-gated, no SEO needed |
| `/` (landing) | SSG | Static |

### API Proxy

Nuxt uses `routeRules` to proxy `/api/**` → `http://api:4000/api/**` (internal Docker network) for SSR. Client-side requests go directly to `https://api.filemcp.com/api`.

---

## Auth Flow

### Web (JWT)
1. POST `/api/auth/login` → returns `{ accessToken, user }`
2. Access token stored in a cookie (`access_token`)
3. Token sent as `Authorization: Bearer <token>` on all API requests

### CLI / curl (API Key)
1. User creates a named API key in dashboard (scoped to an org)
2. Key format: `filemcp_<32 random chars>`
3. Sent as `Authorization: Bearer <key>`
4. Backend identifies `filemcp_` prefix and routes to `ApiKeyGuard`
5. Key is bcrypt-hashed before storage; plaintext never stored
6. API key auth sets `orgId`, `orgSlug`, and `role` on the request user object

---

## Organizations

Every resource (asset, API key) is scoped to an **Organization**. A user can be a member of multiple orgs with a role of `OWNER`, `WRITE`, or `READ`.

On registration, a personal org is automatically created (slug = username). The user is the `OWNER` of that org.

---

## Storage

### File Storage (S3-compatible)
- Local dev: MinIO via Docker
- Production: AWS S3 (eu-central-1)
- Bucket structure:
  ```
  {orgId}/{assetId}/v{version}/original.{ext}
  {orgId}/{assetId}/v{version}/rendered.html   # .md files only
  {orgId}/{assetId}/v{version}/thumbnail.jpg
  ```
- Files served via public S3 URL (`S3_PUBLIC_URL`)
- `S3_ENDPOINT` omitted in production (uses default AWS endpoint); set for MinIO in dev

### Database
- PostgreSQL running in Docker on the same EC2 instance
- Port 5432 bound to `127.0.0.1` — accessible only via SSH tunnel

---

## Job Queue (BullMQ)

### `screenshots` queue
- Triggered: after every upload
- Worker: `apps/worker` — Playwright headless screenshots the rendered asset
- Output: JPEG stored to S3, `Version.thumbnailPath` updated
- Markdown files: screenshot uses the pre-rendered HTML (`renderedPath`), not the raw source

---

## Security

- HTML assets rendered in a sandboxed iframe: `sandbox="allow-scripts"` — no `allow-same-origin`
- API keys bcrypt-hashed before storage; only `keyPrefix` (first 16 chars) indexed for lookup
- CORS: `api.filemcp.com` only accepts requests from `filemcp.com`
- Private assets return 404 (not 403) to prevent enumeration

---

## Infrastructure

```
cloudflare (DNS)
     │
     ▼
EC2 instance (63.182.47.171)
     │
     ▼
nginx (Docker, ports 80/443)
  ├── filemcp.com → web:3000
  ├── api.filemcp.com → api:4000
  ├── staging.filemcp.com → web:3000
  └── api.staging.filemcp.com → api:4000
     │
     ├── web (Nuxt 3, port 3000)
     ├── api (NestJS, port 4000)
     ├── worker (Playwright thumbnail worker)
     ├── postgres (port 5432, 127.0.0.1 only)
     ├── redis (BullMQ)
     └── certbot (Let's Encrypt renewal)
```

Staging and production run on the same EC2 instance using separate Docker Compose stacks deployed to `/srv/docker/`.

Deployment: GitHub Actions (`workflow_dispatch`) → `build.sh` (Docker build + ECR push) → `release.sh` (SSH deploy).
