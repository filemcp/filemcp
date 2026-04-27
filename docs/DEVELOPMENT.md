# Development

This guide gets you a working local FileMCP for hacking on. For production deployment notes, see [DEPLOYMENT.md](DEPLOYMENT.md). For the architecture overview, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Prerequisites

- **Docker** (with Docker Compose v2)
- **Node 22+** (for running anything outside the containers — typically not needed for the dev loop)
- **pnpm 10+** (only needed if you want to run `pnpm` outside containers)

That's it. Everything else (Postgres, Redis, MinIO, the API, the web app, the thumbnail worker) runs in containers.

## First-time setup

```bash
git clone https://github.com/filemcp/filemcp.git
cd filemcp
cp .env.example .env
./bb start
```

The `bb` script is a thin wrapper around `docker compose`. First boot installs dependencies inside the containers and runs Prisma migrations — give it a minute.

When it's ready you'll see:

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/api/docs |
| MinIO console | http://localhost:9001 (login `filemcp` / `filemcp_secret`) |
| Postgres | `localhost:5432` (user/pass `filemcp` / `filemcp`) |
| Redis | `localhost:6379` |

## The `bb` helper

```bash
./bb start                     # bring everything up
./bb stop                      # tear it all down
./bb logs                      # tail all logs
./bb logs --service=api        # tail just the api
./bb restart --service=web     # restart one service after a config change
./bb enter --service=api       # bash shell into a container (useful for prisma)
./bb status                    # see what's running
```

Source code is mounted into the containers (`.:/app`), so edits hot-reload — no rebuild needed for app code.

## Running things outside containers

If you'd rather use your local Node + pnpm:

```bash
pnpm install
pnpm dev:web                   # only the Nuxt frontend
pnpm dev:api                   # only the NestJS API (needs Postgres/Redis/MinIO running)
pnpm dev                       # both, via concurrently
```

The simplest mix: keep the data services in Docker (`./bb start --service=postgres` etc.) and run the API/web from your host for fast IDE-integrated debugging. You'll need to point envs at `localhost` instead of the docker-network hostnames in that case.

## Repo layout

```
filemcp/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── prisma/   # Schema + migrations
│   │   └── src/modules/
│   ├── web/          # Nuxt 3 frontend
│   └── worker/       # Standalone Node worker (thumbnails via Playwright)
├── packages/
│   └── types/        # Shared TS types between api + web
├── docs/             # Specs + guides (this file lives here)
├── docker-compose.yml          # local dev
├── docker-compose.staging.yml  # staging
└── docker-compose.production.yml
```

## Common tasks

### Database

```bash
# Apply pending migrations (also runs automatically on api start)
./bb enter --service=api
pnpm exec prisma migrate deploy

# Create a new migration after editing schema.prisma
pnpm exec prisma migrate dev --name short_snake_case_description

# Browse the database
pnpm exec prisma studio
```

### Tests

```bash
# Backend (Jest unit + e2e). Needs Postgres/Redis running.
docker exec -e DB_HOST=postgres filemcp-api-1 sh -c "cd /app/apps/api && pnpm exec jest"

# Frontend (Vitest)
docker exec filemcp-web-1 sh -c "cd /app/apps/web && pnpm exec vitest run"
```

The API tests use a separate `filemcp_test` database that's auto-created/migrated by the global setup. If schema changes confuse it (rare), drop and recreate:

```bash
docker exec filemcp-postgres-1 psql -U filemcp -d postgres -c "DROP DATABASE IF EXISTS filemcp_test;"
docker exec filemcp-postgres-1 psql -U filemcp -d postgres -c "CREATE DATABASE filemcp_test;"
```

### Typecheck

```bash
pnpm typecheck                     # all packages
pnpm --filter @filemcp/api typecheck
pnpm --filter @filemcp/web typecheck
```

### Email development

By default `EMAIL_DRY_RUN=true` in `.env`, which short-circuits AWS SES — every send writes the rendered HTML to `apps/api/tmp/last-email-{template}.html`. Open that file in a browser to preview. The same file is also written when `DRY_RUN=false` (in addition to the live SES send) so you can iterate visually while live-sending.

To live-send via SES locally, set `EMAIL_DRY_RUN=false` and provide AWS credentials in `.env`. Note that SES sandbox limits sends to verified identities only.

### Adding a new module

Backend (NestJS):

```
apps/api/src/modules/<your-module>/
  <your-module>.module.ts
  <your-module>.service.ts
  <your-module>.controller.ts
  dto/
```

Wire it into `app.module.ts` imports.

Frontend (Nuxt): file-based routing handles most of it. Pages go in `apps/web/pages/`, shared components in `apps/web/components/`, composables (prefixed with `use`) in `apps/web/composables/`.

## Troubleshooting

**API/web container restart loop after pulling latest**
Usually a Prisma client mismatch after a schema change. Run inside the api container:
```bash
./bb enter --service=api
pnpm exec prisma generate
```
Then `./bb restart --service=api`.

**Permission errors on `node_modules` or `dist`**
The containers run as root and can leave root-owned files behind that confuse host tooling. To regenerate from inside the container, prefix Prisma/build commands with `docker exec filemcp-api-1 sh -c "..."`.

**Email templates not loading after a save**
Nest CLI in `--watch` mode copies `.mjml` files to `dist/` via the `assets` config in `nest-cli.json`. If a save creates a temp file the watcher can't find, restart the api: `./bb restart --service=api`.

**Asset thumbnails not generating**
Check the worker logs: `./bb logs --service=playwright-worker`. Thumbnails are queued via BullMQ — Redis must be running.

## Help

- **[Discord](https://discord.gg/hRVhz5WTpe)** — quick questions
- **Discussions** — for longer-form questions and design discussions
- **Issues** — for confirmed bugs or feature requests
