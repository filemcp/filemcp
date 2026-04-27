# Contributing to FileMCP

Thanks for your interest in contributing. This document covers how to set up a local dev environment, the code conventions we follow, and how to get a change merged.

If you're stuck or unsure, ask in **[Discord](https://discord.gg/hRVhz5WTpe)** or open a **[Discussion](https://github.com/filemcp/filemcp/discussions)** — both work.

## Ways to contribute

- **Bug reports** — open a [bug issue](https://github.com/filemcp/filemcp/issues/new?template=bug_report.yml). Steps to reproduce help a lot.
- **Feature requests** — open a [feature issue](https://github.com/filemcp/filemcp/issues/new?template=feature_request.yml). Explain the problem first, then the proposed solution.
- **Pull requests** — for non-trivial changes, please open an issue or discussion first so we can align on the approach before you spend time on code.
- **Docs** — improvements to README, architecture notes, or `docs/` are always welcome.
- **Triage** — reproducing reported bugs, narrowing down repro cases, or labeling issues helps a lot.

## Local development

Full instructions live in **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**. The short version:

```bash
git clone https://github.com/filemcp/filemcp.git
cd filemcp
cp .env.example .env
./bb start
```

That spins up Postgres, Redis, MinIO, the API, the web app, and the thumbnail worker via Docker Compose. Web at `http://localhost:3000`, API at `http://localhost:4000`.

## Code conventions

These mirror the patterns already in the codebase — when in doubt, follow what's nearby.

### General

- **TypeScript strict mode**. No `any` without a comment explaining why.
- **No unnecessary abstractions** — solve the problem in front of you, not a hypothetical future one. Three similar lines is fine; don't extract until there's a real third caller.
- **Comments are for non-obvious *why*** — never *what*. Well-named identifiers do the work. Don't reference the current task or PR in code comments; that belongs in the commit message.
- **Prefer editing existing files** over creating new ones.
- **No backwards-compatibility shims** unless we've already shipped the old behavior to real users.

### NestJS (`apps/api`)

- One module per domain (`assets`, `comments`, `email`, etc.).
- DTOs with `class-validator` decorators on every controller input.
- Services own business logic; controllers handle HTTP mapping only.
- Throw NestJS `HttpException` subclasses (e.g. `NotFoundException`, `ForbiddenException`) — not raw 500s.
- Use `@nestjs/config` and the typed config service — never read `process.env` directly in application code.

### Nuxt (`apps/web`)

- File-based routing in `pages/`, components in `components/`, composables in `composables/` (prefixed with `use`).
- API calls via the `$api` composable wrapping `$fetch`.
- Tailwind utility classes only — no inline `style` except for arbitrary computed values.
- Single-responsibility components, PascalCase filenames.

### Database

- All schema changes go through Prisma migrations (`prisma/migrations/`).
- Migration filenames: `YYYYMMDDHHMMSS_short_snake_case_description`.

### Tests

- Backend: Jest unit + e2e (`*.spec.ts`, `*.e2e-spec.ts`). Run with `pnpm --filter @filemcp/api test`.
- Frontend: Vitest. Run with `pnpm --filter @filemcp/web test`.

### Commits

We use casual short messages — match what's in `git log`. No strict conventional-commits enforcement, but a clear summary line and (when useful) a short body explaining the *why* is appreciated.

Don't include AI-attribution trailers (`Co-Authored-By: Claude ...` etc.) in commits.

## Pull requests

1. Fork (or branch if you have write access) off `main`.
2. Branch name: `feat/...`, `fix/...`, `docs/...`, `chore/...` — short and descriptive.
3. Keep PRs focused. One concern per PR makes review easier and reverts safer.
4. Run the relevant test suite and typecheck before pushing:
   ```bash
   pnpm typecheck
   pnpm --filter @filemcp/api test
   pnpm --filter @filemcp/web test
   ```
5. Open the PR against `main`. Fill out the template — what changed, why, how it was tested, screenshots if UI.
6. CI must pass. If review is requested, address feedback as new commits (don't force-push during review unless asked).

## Releases

We use GitHub Releases tied to tags. Releases are cut by maintainers when there's a meaningful set of merged changes. Notable user-facing changes get a brief CHANGELOG entry.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
