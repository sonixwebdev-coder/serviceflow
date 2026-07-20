# Contributing to ServiceFlow

Thank you for improving ServiceFlow. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before starting

Search the issue tracker for existing work. For a substantial feature, data-model change, public API change, or new dependency, open a proposal before implementation. Bug fixes should include a minimal reproduction and a regression test.

ServiceFlow preserves existing REST routes, response shapes, public URLs, and Prisma semantics whenever possible. Compatibility changes require an additive adapter and migration notes.

## Development workflow

1. Use Node 24 and npm 11.
2. Run `npm ci` from the repository root.
3. Copy `.env.example` to `.env` and use only disposable local credentials.
4. Start PostgreSQL and Redis with `docker compose up -d postgres redis`.
5. Apply development migrations with `npm run prisma:migrate --workspace apps/backend`.
6. Make focused changes with tests.
7. Run `npm run check` and `git diff --check` before submitting.

Use `npm run test:integration` when changing API contracts, persistence, authentication, tenant-aware behavior, uploads, exports, jobs, or realtime events.

## Code expectations

- Keep route handlers thin and put business rules in cohesive services.
- Keep React pages as orchestration layers backed by focused components and hooks.
- Prefer modules below 500 lines; documented declarative data and generated migrations are exceptions.
- Use the structured backend logger rather than `console` in runtime code.
- Never commit secrets, customer data, production identifiers, database dumps, or generated environment files.
- Document every environment variable in `.env.example` with an inert value.
- Format with Prettier and keep ESLint at zero warnings.

## Commits and pull requests

Keep commits reviewable and avoid unrelated formatting or generated artifacts. A pull request should explain the problem, behavior before and after, compatibility impact, test evidence, configuration changes, and screenshots for visible UI changes.

Contributions are accepted under the repository's AGPL-3.0-only license.
