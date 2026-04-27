# Deployment

This document covers operational deployment notes for FileMCP — production environments, scaling, observability, and the release workflow used for the hosted [filemcp.com](https://filemcp.com) instance.

For a single-host self-hosted deploy, [SELF_HOSTING.md](SELF_HOSTING.md) is probably what you want. For local development, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Environments

The repo defines three compose files mapping to three environments:

| Environment | Compose file | Purpose |
| --- | --- | --- |
| Development | `docker-compose.yml` | Local hacking, source mounted, hot reload |
| Staging | `docker-compose.staging.yml` | Production-like, used for pre-merge validation |
| Production | `docker-compose.production.yml` | Live traffic |

The hosted service uses `docker-compose.production.yml` plus a Cloudflare proxy in front and AWS-managed Postgres/Redis/S3.

## Release scripts

The repo includes two helper scripts that target the hosted service's deployment shape. Adapt them as needed for your own environment.

- **`build.sh`** — builds Docker images for `api`, `web`, and `worker` and pushes them to AWS ECR.
- **`release.sh`** — SSHes into the staging or production host, pulls the latest images, and runs `docker compose ... up -d` to roll the stack.

Typical flow:

```bash
./build.sh                # build & push images to ECR
./release.sh staging      # deploy to staging
# (validate)
./release.sh production   # deploy to production
```

These are starting points, not the only way. CI/CD via GitHub Actions, Kubernetes rollouts, or platform-specific tooling (Fly, Railway, Render) all work — the only hard requirements are running the three apps (api, web, worker) and the data services (Postgres, Redis, S3-compatible) and connecting them via env vars.

## Required environment

See [SELF_HOSTING.md](SELF_HOSTING.md#environment-variables) for the full set. In production specifically:

- `JWT_SECRET` must be a strong random secret. Don't use the development default. `openssl rand -hex 64`.
- `APP_URL`, `API_URL`, and `ALLOWED_ORIGINS` must be your real production URLs (full `https://...`).
- `EMAIL_DRY_RUN` must be `false` and `AWS_*` credentials set, otherwise password reset and invite emails won't deliver.
- `S3_PUBLIC_URL` must be reachable from end-user browsers — use a CDN or a public bucket.

## Database

- The `api` container runs `prisma migrate deploy` on startup, so migrations apply automatically.
- For zero-downtime deploys, schema changes should be backwards-compatible (add columns nullable, ship code that reads new + old, then later make non-null in a follow-up migration).
- Daily logical backups via `pg_dump` are sufficient for most setups. For higher RPO/RTO, use AWS RDS / Cloud SQL / managed Postgres with point-in-time recovery.

## Object storage

The asset payloads (uploaded files, rendered HTML, thumbnails) live in S3. We've tested the API against AWS S3, Cloudflare R2, and MinIO. Anything S3-compatible should work.

- **Public URL strategy** — `S3_PUBLIC_URL` is what the asset viewer fetches from. Either:
  - Point it at a CDN (CloudFront / Cloudflare) for caching and lower latency, or
  - Use the bucket's direct public URL for simpler setups.
- **CORS** — must allow GET from your `APP_URL` since the iframe-rendered HTML loads its own assets via fetch.

## Worker (thumbnails)

The `playwright-worker` service consumes the `screenshots` BullMQ queue and renders asset thumbnails using headless Chromium. It's CPU + memory heavy compared to the api/web — give it at least 1 GB of RAM. Multiple workers can run in parallel; BullMQ handles job distribution.

If thumbnails aren't critical for your deployment, the worker is optional — the asset viewer falls back to a placeholder when no thumbnail is available.

## Observability

The hosted service uses (at the time of writing) basic stdout logging plus AWS CloudWatch for metrics. The codebase doesn't bundle a specific APM solution. Suggested integration points if you want them:

- **Logs** — pipe stdout from the containers to your log aggregator (Datadog, Loki, CloudWatch).
- **Errors** — wrap the NestJS bootstrap with a Sentry init (`@sentry/node`) and the Nuxt app with `@sentry/vue`.
- **Metrics** — `@nestjs/terminus` for a `/health` endpoint; Prometheus exporter for app-level metrics.

We may bundle some of these in the future, but they're explicitly out of scope right now to keep the dependency surface small.

## Scaling notes

- **Web app** — stateless, horizontally scalable behind a load balancer.
- **API** — stateless, horizontally scalable. Sticky sessions are not required.
- **Worker** — horizontally scalable; BullMQ distributes jobs.
- **Database** — vertical scale first; read replicas not currently used by the app.
- **Redis** — single instance is fine for typical loads. The queue is durable, so a brief Redis restart drops in-flight job ACKs but not the jobs themselves.

The main bottleneck under load is usually the worker (Chromium is heavy). Scale that horizontally before anything else if thumbnail latency grows.

## Rolling back

Because images are tagged in ECR (or whatever registry you use), rollback is a re-deploy:

```bash
./release.sh production --image-tag=<previous-good-sha>
```

Schema migrations are *not* automatically rolled back. If a migration is incompatible with the previous code version, you'll need to ship a follow-up migration that restores the previous shape — never `prisma migrate reset` against production data.

## CI

`.github/workflows/test.yml` runs the backend Jest + frontend Vitest suites on every PR. Required to pass before merge to `main`.

`.github/workflows/deploy.yml` is a manual-dispatch workflow that takes a target environment (staging / production) and a branch name and runs the build + release flow. The hosted instance uses this to ship changes.

## Security

Operational notes — for the responsible-disclosure process see [SECURITY.md](../SECURITY.md).

- Always run with HTTPS in production. The reverse proxy enforces this for the hosted instance.
- Rotate `JWT_SECRET` carefully — it'll log out all users.
- Rotate API keys via the dashboard's `/dashboard/keys` page when staff leaves or a key is suspected leaked.
- AWS credentials should be scoped to the minimum required (S3 bucket read/write + SES send) — never use a root account key.
- Keep dependencies current. Dependabot is configured for weekly updates.
