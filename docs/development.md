# Development

## Setup

Use Node 24 and npm 11. From the repository root:

```bash
cp .env.example .env
docker compose up -d postgres redis
npm ci
npm run prisma:generate --workspace apps/backend
npm run prisma:migrate --workspace apps/backend
```

Replace the example signing and encryption values in `.env`. Local databases and Redis instances must not contain production data.

`npm run dev` starts all five applications: the API, CRM, client portal, website renderer,
and platform admin. Use the root `dev:*` commands when you want to run fewer processes or keep
their output in separate terminals.

## Tests and checks

```bash
npm run format:check
npm run lint
npm test
npm run test:integration
npm run prisma:validate
npm run build
npm run env:check
npm run modules:check
npm run bundle:check
npm run release:inventory
```

`npm run check` aggregates the main non-container gate. `npm run test:integration` uses Docker
Compose to create uniquely named, disposable PostgreSQL and Redis services, deploys every migration,
runs the backend integration suite, and removes the containers and temporary volumes. Docker with
Compose v2 must be available; the command deliberately ignores any existing database URLs so it
cannot target a shared database.

Frontend tests use Vitest and Testing Library. Backend tests use Jest and Supertest. Put tests next to the owning application and name only real test modules with `.test.*` or `.spec.*`.

## Database changes

Change `prisma/schema.prisma`, create a named development migration, inspect the generated SQL, then validate both a fresh database and an upgrade from the previous schema. Do not edit a migration that may already have been deployed.

## Code organization

Routes should translate HTTP input/output and delegate to services. Services own cohesive business behavior; data-access helpers own reusable query logic. React pages should coordinate focused components and hooks rather than accumulate unrelated UI and effects.

Keep production modules below 500 lines unless they are a documented declarative-data exception. Avoid `console` in runtime backend code, dependency cycles, implicit cross-tenant queries, and environment access spread across UI components.

The module-size check uses a ratcheted baseline for legacy oversized files: new oversized modules,
growth, and unrecorded reductions fail the check. When a refactor reduces a grandfathered module,
lower or remove its entry in `scripts/module-size-baseline.json` so the improvement cannot regress.

After building all browser applications, `npm run bundle:check` rejects any production JavaScript
chunk larger than 500 kB. Split routes, features, or large dependencies instead of increasing the
budget.
