# ServiceFlow

ServiceFlow is an open-source platform for service businesses. It combines customer management, appointments, invoicing, team operations, public websites, online booking, a client portal, loyalty, and real-time messaging in one multi-tenant system.

The reusable project and its default identity are **ServiceFlow**. **ForjaIt** is a separately configured commercial distribution built from this engine; see [ATTRIBUTION.md](ATTRIBUTION.md).

> ServiceFlow is being prepared for its first public release. Review the changelog before operating it with production data.

## Applications

| Workspace            | Purpose                                   | Development URL         |
| -------------------- | ----------------------------------------- | ----------------------- |
| `apps/frontend`      | Organization CRM and operations dashboard | `http://localhost:5173` |
| `apps/client-portal` | Customer portal, marketplace, and booking | `http://localhost:5174` |
| `apps/website`       | Organization website renderer             | `http://localhost:5175` |
| `apps/admin`         | Platform administration                   | `http://localhost:5176` |
| `apps/backend`       | REST API, jobs, and Socket.IO server      | `http://localhost:5000` |

PostgreSQL is the system of record. Prisma owns the database schema and migrations, while Redis supports caching, rate limiting, presence, and realtime workloads. The four browser applications use React, Vite, and a shared runtime configuration package.

## Capabilities

- Multi-tenant CRM, clients, assets, services, resources, and locations
- Calendar appointments, online booking, reminders, and Google Calendar integration
- Invoices, exports, Stripe subscription billing, and configurable email templates
- Employee roles, tasks, leave, time tracking, audit activity, and analytics
- Organization website builder, leads, marketplace, client portal, and loyalty
- Realtime team/client messaging, attachments, voice messages, and notifications
- Optional TOTP two-factor authentication, role-based access, CSRF controls, and audit logs

These features help operators implement privacy and security controls; they do not make a deployment automatically compliant with any law. Each operator remains responsible for configuration, notices, retention, processor agreements, access handling, and applicable legal obligations.

## Prerequisites

- Node.js 24 LTS
- npm 11
- PostgreSQL 16+
- Redis 7+
- Docker with Compose, recommended for local infrastructure and deployment validation

## Quick start

```bash
cp .env.example .env
# Replace every example secret in .env before starting the API.

docker compose up -d postgres redis
npm ci
npm run prisma:validate
npm run prisma:generate --workspace apps/backend
npm run prisma:migrate --workspace apps/backend
npm run dev
```

`npm run dev` starts all five applications. Use the individual `dev:*` commands when you want fewer processes or separate terminal output.

Do not use example credentials outside a disposable development environment. Do not run development migrations against a shared or production database.

## Repository commands

| Command                     | Purpose                                                                         |
| --------------------------- | ------------------------------------------------------------------------------- |
| `npm run lint`              | Lint every application, package, script, and Prisma helper with zero warnings   |
| `npm run format:check`      | Verify repository formatting                                                    |
| `npm test`                  | Run all unit and component tests                                                |
| `npm run test:integration`  | Run migrations and backend tests against disposable PostgreSQL/Redis containers |
| `npm run build`             | Build all four browser applications                                             |
| `npm run prisma:validate`   | Validate the Prisma schema                                                      |
| `npm run env:check`         | Check environment-variable documentation and reject credential-shaped examples  |
| `npm run modules:check`     | Enforce the 500-line production-module ratchet                                  |
| `npm run bundle:check`      | Enforce the 500 kB production JavaScript chunk budget                           |
| `npm run audit`             | Run the dependency vulnerability gate                                           |
| `npm run release:inventory` | Generate the production CycloneDX SBOM and dependency-license inventory         |
| `npm run check`             | Run the main local quality gate                                                 |

## Configuration and branding

Start with [.env.example](.env.example). Backend platform identity uses `PLATFORM_NAME`, `PLATFORM_URL`, and `PLATFORM_CONTACT_EMAIL`. Static applications first read `window.__SERVICEFLOW_CONFIG__`; `VITE_*` values remain build-time fallbacks. The supplied nginx images generate runtime configuration from `SERVICEFLOW_*` variables when each container starts.

Set `WEBSITE_BASE_URL` for path-based sites such as `https://sites.example.com/acme`. Existing subdomain installations can use `WEBSITE_URL_TEMPLATE=https://{subdomain}.example.com` without changing stored slugs or public routes.

For the complete variable reference and commercial-distribution example, see [docs/configuration.md](docs/configuration.md) and [docs/branding.md](docs/branding.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Configuration](docs/configuration.md)
- [Docker deployment](docs/deployment.md)
- [Branding](docs/branding.md)
- [Backup and restore](docs/backup-restore.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Dependency audit exceptions](docs/dependency-exceptions.md)
- [Dependency licenses and SBOM](docs/dependency-licenses.md)
- [API contract and route coverage](docs/api.md)
- [OpenAPI specification](docs/openapi.json)
- [Backend API notes](apps/backend/README.md)

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change and follow the [Code of Conduct](CODE_OF_CONDUCT.md). Use the repository issue tracker for reproducible defects and feature proposals. See [SUPPORT.md](SUPPORT.md) for support boundaries and [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## License

ServiceFlow is licensed under the [GNU Affero General Public License v3.0 only](LICENSE). If you modify the software and make it available to users over a network, AGPL section 13 requires offering those users the Corresponding Source of the running version. This summary is not legal advice; the license text controls.
