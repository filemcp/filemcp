# filemcp — Claude Code Project Context

## What We're Building

A hosting platform for AI-generated assets. The hypothesis: terminal AI is now good enough that PowerPoint, certain docs, and other rich content will increasingly be generated as HTML/Markdown/JSON rather than created in traditional tools. The missing piece is **distribution** — a fast, clean way to push a generated file and get a shareable URL that renders it beautifully.

Think "Vercel for single AI-generated artifacts." Generate a deck with Claude, `curl` it to filemcp, get a URL back in one second.

## Core Product Decisions (locked)

- **Upload surface**: curl / REST API / MCP server / API keys — NOT a drag-and-drop UI
- **Viewer**: dashboard and per-asset viewer are read-only; no in-platform editing
- **Collaboration**: sharing + viewing links + **inline commenting** (click anywhere on a rendered asset to leave a note — Figma-style)
- **Versioning**: every upload to the same asset slug creates a new version; permanent URLs per version
- **URL structure**: `/u/:username/:asset-slug` and `/u/:username/:asset-slug/v/:version`
- **Custom domains**: deferred — tackle after core flow works

## Tech Stack

### Backend — NestJS
- **Framework**: NestJS with Fastify adapter
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Storage**: S3-compatible (MinIO for local dev, AWS S3 / Cloudflare R2 for prod)
- **Auth**: Passport + JWT for web sessions; API key auth for CLI/curl
- **Queue**: BullMQ (for async jobs: markdown → HTML rendering, thumbnail gen)
- **Language**: TypeScript, strict mode

### Frontend — Nuxt 3
- **Framework**: Nuxt 3 with TypeScript
- **Styling**: Tailwind CSS + shadcn-vue
- **State**: Pinia
- **Rendering**: SSR for public asset pages (SEO + share previews); SPA for dashboard

## How We Code

### General
- TypeScript strict mode everywhere — no `any` without a comment explaining why
- No unnecessary abstractions — solve the problem in front of you, not a hypothetical future one
- No comments explaining *what* code does — only *why* when it would surprise a reader
- Prefer editing existing files over creating new ones
- Small, focused modules — one responsibility per NestJS module / Nuxt composable

### NestJS Conventions
- One module per domain: `assets`, `users`, `versions`, `comments`, `auth`, `storage`
- DTOs with `class-validator` decorators on every controller input
- Services own business logic; controllers own HTTP mapping only
- Guards for auth (`JwtAuthGuard`, `ApiKeyGuard`)
- Use `@nestjs/config` with a typed config service — never read `process.env` directly in application code
- Prisma service as a singleton provider in a `PrismaModule`
- Errors: throw NestJS `HttpException` subclasses from services, not raw 500s

### Nuxt Conventions
- Composables in `composables/` — prefix with `use`
- Pages in `pages/` following file-based routing
- API calls via a typed `$api` composable wrapping `$fetch`
- No inline styles — Tailwind utility classes only
- Components: PascalCase filenames, single-responsibility

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Feature branches off `main`; PRs required (no direct push to main)

## Project Structure (target)

```
filemcp/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # Nuxt 3 frontend
├── packages/
│   └── types/        # Shared TypeScript types (DTOs, API contracts)
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   └── API_SPEC.md
├── CLAUDE.md         # This file
└── package.json      # pnpm workspace root
```

Monorepo managed with **pnpm workspaces**.

## Resolved Decisions

| Decision | Choice |
|----------|--------|
| HTML rendering | Sandboxed iframe — `sandbox="allow-scripts"`, no `allow-same-origin` |
| Comment anchor (HTML) | x/y percentage primary; CSS selector path as fallback for version re-anchoring |
| Anonymous commenting | Allowed — required display name, optional email; post-submit account creation nudge |
| Markdown rendering | Server-side at upload time via `unified` pipeline; rendered HTML stored to S3; viewer always gets pre-rendered HTML |

## Key Open Questions (to resolve before building)

1. Auth provider — self-managed JWT or delegate to a service (Auth0, Clerk)?
2. Rate limiting strategy for public asset views (unauthenticated CDN-style access)

## Sessions — What to Do First

When picking up this project:
1. Read `docs/PRODUCT_SPEC.md` for feature scope
2. Read `docs/ARCHITECTURE.md` for system design
3. Read `docs/API_SPEC.md` for the API contract
4. Check `apps/api/` and `apps/web/` for current implementation state
5. Ask the user which layer to work on next
