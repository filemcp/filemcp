# Self-hosting FileMCP

This guide covers running your own FileMCP instance. The hosted service at [filemcp.com](https://filemcp.com) is operated by NSpark, Inc. — the code in this repo is MIT-licensed and you're welcome to run it yourself for personal, team, or commercial use.

For just hacking on the code locally, see [DEVELOPMENT.md](DEVELOPMENT.md). For production-grade deployment notes (scaling, SES setup, S3 vs R2, etc.), see [DEPLOYMENT.md](DEPLOYMENT.md).

> **Heads up:** this is a starting baseline. We'll iterate on the self-host story as the community grows. If you hit something that should be documented here, [open an issue](https://github.com/filemcp/filemcp/issues) or PR.

## What you need

A single Linux host with:

- **Docker** + Docker Compose v2
- **2 GB RAM minimum**, 4 GB recommended (the Playwright worker is the heaviest piece)
- A domain name pointing at the host (for HTTPS)
- Optional: AWS account for SES (transactional email) — without it, password reset and invitations won't deliver

That's it. Postgres, Redis, and MinIO (S3-compatible storage) are bundled in the compose file. Swap MinIO for AWS S3 / Cloudflare R2 / any S3-compatible store if you'd rather.

## Single-host deploy with Docker Compose

The repo includes three compose files:

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | Local dev (no TLS, source mounted, hot reload) |
| `docker-compose.staging.yml` | Staging — production-like, with healthchecks and a reverse proxy |
| `docker-compose.production.yml` | Production reference |

For a self-hosted deploy, use `docker-compose.production.yml` as a starting point. Roughly:

```bash
# 1. Clone on your host
git clone https://github.com/filemcp/filemcp.git
cd filemcp

# 2. Configure
cp .env.example .env
$EDITOR .env  # see "Environment variables" below

# 3. Start
docker compose -f docker-compose.production.yml up -d
```

The compose stack runs:

- `postgres` — Postgres 16
- `redis` — Redis 7 (used by BullMQ for the thumbnail queue)
- `minio` (or skip if using external S3)
- `api` — NestJS backend
- `web` — Nuxt 3 frontend
- `playwright-worker` — Chromium + Playwright, generates thumbnails

## Environment variables

The full set is in `.env.example`. Key ones to set for self-hosting:

```bash
# Database — change these in production
DATABASE_URL="postgresql://filemcp:STRONGPASSWORD@postgres:5432/filemcp"

# JWT — generate a strong random secret. Use `openssl rand -hex 64`.
JWT_SECRET="..."

# S3 / object storage
S3_ENDPOINT="..."           # https://s3.amazonaws.com or your R2/MinIO endpoint
S3_REGION="us-east-1"
S3_BUCKET="filemcp-assets"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_PUBLIC_URL="https://your-cdn-or-s3-public-url"

# Public URLs — used in emails and OG meta
APP_URL="https://files.example.com"
API_URL="https://files.example.com"  # if API and web share a domain
ALLOWED_ORIGINS="https://files.example.com"

# AWS SES (transactional email) — optional but strongly recommended
EMAIL_DRY_RUN="false"
EMAIL_FROM_ADDRESS="noreply@yourdomain.com"
EMAIL_FROM_NAME="FileMCP"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."

# Org limits — tune to taste
ORG_ASSET_LIMIT=10
ORG_ASSET_LIMIT_PER_MEMBER=5
MCP_MAX_FILE_SIZE_MB=5
```

## TLS / reverse proxy

Production needs HTTPS. The `nginx/` directory contains a sample config plus the `init-letsencrypt.sh` and `certbot-init.sh` scripts to set up Let's Encrypt certificates on first run. Roughly:

```bash
./certbot-init.sh yourdomain.com you@yourdomain.com
./init-letsencrypt.sh
```

If you'd rather use Caddy, Cloudflare Tunnel, Traefik, or a managed load balancer — go for it. The API listens on `:4000` and the web app on `:3000`; reverse-proxy as you like.

## S3 vs MinIO

For development MinIO (bundled in the compose file) works fine. For production you have options:

- **AWS S3** — the original. Set `S3_ENDPOINT="https://s3.amazonaws.com"` (or the regional endpoint).
- **Cloudflare R2** — S3-compatible, no egress fees. Set `S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"`.
- **Backblaze B2 / DigitalOcean Spaces / etc.** — any S3-compatible store works.
- **MinIO** — works for self-hosted production too, especially if you're keeping data on-prem.

`S3_PUBLIC_URL` should be a CDN or public bucket URL that serves rendered HTML and thumbnails directly to browsers — that's what the asset viewer fetches.

## Email (AWS SES)

Without email, password reset and workspace invitations won't deliver. To set up SES:

1. Verify your sending domain in the SES console (DKIM records).
2. (Recommended) Set up a custom MAIL FROM domain for SPF/DMARC alignment.
3. By default new SES accounts are in **sandbox mode** — you can only send to verified addresses. Request production access in the SES console; approval is usually fast.
4. Create an IAM user with `AmazonSESFullAccess` (or a tighter scoped policy) and use those credentials in `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`.

If you don't want SES, set `EMAIL_DRY_RUN=true` — outbound email is logged but not sent. Users won't be able to recover passwords; invite links will need to be hand-delivered.

## Backups

The data that matters:

- **Postgres** — daily logical backup with `pg_dump`, off-host. Schedule via cron or your hosting platform.
- **S3 bucket** — uploaded assets and rendered HTML. Versioning + lifecycle rules in the storage layer is usually enough.

Redis state (BullMQ queues) is regenerated automatically; no need to back it up.

## Updating

```bash
git pull
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

The api container runs `prisma migrate deploy` on start, so schema migrations apply automatically.

## What's not covered (yet)

We'll fill these in as the self-host community grows. PRs welcome.

- Multi-host deployments (separate API / worker / DB hosts)
- Kubernetes manifests / Helm chart
- Single sign-on (SAML / OIDC)
- Granular MCP server scoping per-API-key
- Custom domains for assets (hosted has this; self-host inherits whatever you reverse-proxy)

## Help

If your deployment hits something this guide doesn't cover, ask in [Discord](https://discord.gg/filemcp) or open a [Discussion](https://github.com/filemcp/filemcp/discussions). We try to fold answers back into this guide.
